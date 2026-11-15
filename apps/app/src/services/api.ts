/**
 * Backend SSE/API client. Parses the frozen SSE wire format (event:/data:
 * blocks) from @socrates/core SSE events. Network/HTTP failures surface as a
 * BackendError; callers fall back to the built-in demo flow.
 */
import type { ChatRequest, SseEvent } from "@socrates/core";
import type { CompareResult, FootprintResult } from "@socrates/data";
import { backendUrl, ENDPOINTS, env } from "../config/env";

export class BackendError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

export interface SseHandlers {
  onState?: (data: { session_id: string; mi_state: string; turn: number }) => void;
  onToolCall?: (data: { tool: string; args: Record<string, unknown> }) => void;
  onToolResult?: (data: { tool: string; ok: boolean; result?: unknown; error?: string }) => void;
  onToken?: (delta: string) => void;
  onDatacard?: (result: FootprintResult) => void;
  onCompare?: (result: CompareResult) => void;
  onCommitment?: (data: { commitment_id: string; suggested: boolean }) => void;
  onError?: (data: { code: string; message: string }) => void;
  onDone?: (data: { finish_reason: string; turn: number }) => void;
}

interface RawSseBlock {
  event: string | null;
  data: unknown;
}

function parseSseBlock(block: string): RawSseBlock | null {
  let event: string | null = null;
  let dataLine = "";
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
  }
  if (!event || dataLine.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLine) };
  } catch {
    return null;
  }
}

function dispatch(handlers: SseHandlers, block: RawSseBlock): void {
  const data = block.data as Record<string, unknown>;
  switch (block.event) {
    case "state":
      handlers.onState?.(data as never);
      break;
    case "tool_call":
      handlers.onToolCall?.(data as never);
      break;
    case "tool_result":
      handlers.onToolResult?.(data as never);
      break;
    case "token":
      handlers.onToken?.(String((data as { delta?: string }).delta ?? ""));
      break;
    case "datacard":
      handlers.onDatacard?.(data as unknown as FootprintResult);
      break;
    case "compare":
      handlers.onCompare?.(data as unknown as CompareResult);
      break;
    case "commitment":
      handlers.onCommitment?.(data as never);
      break;
    case "error":
      handlers.onError?.(data as never);
      break;
    case "done":
      handlers.onDone?.(data as never);
      break;
    default:
      /* unknown event names are ignored per contract */
  }
}

/** Stream one /chat turn over SSE. Rejects with BackendError on failure. */
export async function streamChat(req: ChatRequest, handlers: SseHandlers): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.publishableKey) {
    headers.apikey = env.publishableKey;
    headers.Authorization = `Bearer ${env.publishableKey}`;
  }

  let response: Response;
  try {
    response = await fetch(backendUrl(ENDPOINTS.chat), {
      method: "POST",
      headers,
      body: JSON.stringify(req),
    });
  } catch (cause) {
    throw new BackendError("NETWORK", cause instanceof Error ? cause.message : "网络请求失败");
  }

  if (!response.ok) {
    throw new BackendError("UPSTREAM_ERROR", `后端返回 ${response.status}`);
  }

  const body = response.body;
  if (!body) {
    // No streaming body: treat empty as a completed turn.
    handlers.onDone?.({ finish_reason: "stop", turn: 1 });
    return;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const blocks = buffer.split(/\n\n/);
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const parsed = parseSseBlock(block);
      if (parsed) dispatch(handlers, parsed);
    }
  }

  if (buffer.trim().length > 0) {
    const parsed = parseSseBlock(buffer);
    if (parsed) dispatch(handlers, parsed);
  }
}

/** Persist a commitment via backend when configured; otherwise the local store owns it. */
export async function saveCommitmentBackend(input: {
  text: string;
  categoryId: string;
  alternative: string;
  barrier?: string | null;
  plan?: string | null;
  followUpDays?: number;
}): Promise<{ id: string } | null> {
  if (!env.supabaseUrl) return null;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (env.publishableKey) {
      headers.apikey = env.publishableKey;
      headers.Authorization = `Bearer ${env.publishableKey}`;
    }
    const response = await fetch(backendUrl(ENDPOINTS.commitment), {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { commitment_id?: string; id?: string };
    return { id: json.commitment_id ?? json.id ?? "remote" };
  } catch {
    return null;
  }
}

export type { SseEvent };
