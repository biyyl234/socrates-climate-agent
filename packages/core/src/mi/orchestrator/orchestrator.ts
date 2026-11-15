/**
 * MI conversation orchestrator (report §6). Drives the frozen state machine,
 * emits the §3.4 SSE event sequence, gates tools per state, and applies the
 * guard pipeline: regenerate once, then degrade to a neutral datacard message.
 */

import { SYSTEM_PROMPT } from "../../prompts/system-prompt";
import type { ChatMessage, LlmAdapter } from "../../adapters/llm";
import { LlmError } from "../../adapters/llm";
import {
  classifySensitive,
  redirectLine,
} from "../../guards/sensitive";
import {
  buildAuthorizedFromToolResults,
  DEGRADED_NEUTRAL_TEXT,
  markDegraded,
  nextGuardAction,
  stripUnregisteredUrls,
  validateReply,
  type GuardContext,
  type GuardReport,
} from "../../guards/validate-reply";
import {
  getToolDefinition,
  validateToolCall,
  validateToolResult,
} from "../../tools";
import type { ToolName } from "../states";
import { canTransition, isToolAllowed, type MIState } from "../states";
import type { ChatErrorCode, SseEvent } from "../../protocol/sse-events";
import type {
  OrchestratorContext,
  OrchestratorSignals,
  ToolExecutor,
} from "./types";
import { decideNextState, detectProductMention } from "./transition";

const COMPARE_INTENT_RE = /哪个|对比|比较|vs|VS|区别|替代|还是/;

/** Legal chain used to fast-forward along the MI flow for this turn's intent. */
const FORWARD_CHAIN: Record<MIState, MIState | undefined> = {
  WELCOME: "RAPPORT",
  RAPPORT: "DISCOVERY",
  DISCOVERY: "FACT_SHARING",
  FACT_SHARING: "DECISION",
  DECISION: "COMMITMENT",
  COMMITMENT: "CLOSING",
  CLOSING: undefined,
  GUARDED: undefined,
  FALLBACK: undefined,
};

export interface OrchestratorConfig {
  llm: LlmAdapter;
  executor?: ToolExecutor;
  sessionId?: string;
  locale?: string;
  mode?: "assisted" | "demo";
  systemPrompt?: string;
  maxToolCalls?: number;
}

export const FALLBACK_NETWORK_LINE = "网络不太稳定，已切换到离线示例模式。";
export const FALLBACK_TOOL_LINE = "这项数据暂时没取到，我们先用已知信息聊。";

const DEFAULT_MAX_TOOL_CALLS = 6;

function sessionIdSeed(): string {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function mapLlmErrorToCode(error: LlmError): ChatErrorCode {
  switch (error.kind) {
    case "timeout":
      return "UPSTREAM_TIMEOUT";
    case "rate_limit":
      return "RATE_LIMITED";
    case "missing_credentials":
    case "auth":
    case "invalid_response":
    case "unavailable":
      return "LLM_UNAVAILABLE";
    default:
      return "UPSTREAM_ERROR";
  }
}

export class MiOrchestrator {
  readonly sessionId: string;
  readonly locale: string;
  readonly mode: "assisted" | "demo";
  state: MIState;
  turn = 0;
  messages: ChatMessage[];
  lastGuardReport: GuardReport | null = null;

  private readonly llm: LlmAdapter;
  private readonly executor?: ToolExecutor;
  private readonly maxToolCalls: number;
  private authorizedResults: unknown[] = [];
  private signals: OrchestratorSignals = {};
  private guardContext: GuardContext = {};

  constructor(config: OrchestratorConfig) {
    this.llm = config.llm;
    this.executor = config.executor;
    this.sessionId = config.sessionId ?? sessionIdSeed();
    this.locale = config.locale ?? "zh-CN";
    this.mode = config.mode ?? "assisted";
    this.maxToolCalls = config.maxToolCalls ?? DEFAULT_MAX_TOOL_CALLS;
    this.state = "WELCOME";
    this.messages = [{ role: "system", content: config.systemPrompt ?? SYSTEM_PROMPT }];
  }

  /**
     * Move along the frozen transition chain to the stage this turn's intent
     * belongs to (product discovery vs comparison). Tools are then gated
     * against that effective stage; later deterministic signals still override.
     */
  private preAdvance(text: string, context?: OrchestratorContext): MIState {
    if (!detectProductMention(text, context)) return this.state;
    const target: MIState = COMPARE_INTENT_RE.test(text) ? "DECISION" : "DISCOVERY";
    let current = this.state;
    while (current !== target) {
      const next = FORWARD_CHAIN[current];
      if (!next || !canTransition(current, next)) break;
      current = next;
    }
    return current;
  }

  private stateEvent(nextState: MIState, turn: number): SseEvent {
    return {
      event: "state",
      data: { session_id: this.sessionId, mi_state: nextState, turn },
    };
  }

  private allowedToolSpecs() {
    return Object.values(
      Object.fromEntries(
        (Object.keys(TOOL_NAME_SET) as ToolName[])
          .filter((name) => isToolAllowed(this.state, name))
          .map((name) => {
            const def = getToolDefinition(name);
            return [
              name,
              { name: def.name, description: def.description, parameters: def.parameters },
            ];
          }),
      ),
    );
  }

  async handleUserMessage(
    message: string,
    context?: OrchestratorContext,
  ): Promise<SseEvent[]> {
    const events: SseEvent[] = [];
    this.turn += 1;
    this.messages.push({ role: "user", content: message });

    this.state = this.preAdvance(message, context);
    events.push(this.stateEvent(this.state, this.turn));

    const hardHit = classifySensitive(message).find((hit) => hit.hard);
    if (hardHit) {
      this.state = "GUARDED";
      events.push(this.stateEvent("GUARDED", this.turn));
      const reply = redirectLine(hardHit.category);
      this.messages.push({ role: "assistant", content: reply });
      events.push({ event: "token", data: { delta: reply } });
      events.push({ event: "done", data: { finish_reason: "blocked", turn: this.turn } });
      if (canTransition("GUARDED", "RAPPORT")) this.state = "RAPPORT";
      return events;
    }

    try {
      events.push(...(await this.runTurn(message, context)));
    } catch (error) {
      const code =
        error instanceof LlmError ? mapLlmErrorToCode(error) : "UPSTREAM_ERROR";
      const messageText = error instanceof Error ? error.message : "internal error";
      events.push({ event: "error", data: { code, message: messageText } });
      this.state = "FALLBACK";
      events.push(this.stateEvent("FALLBACK", this.turn));
      events.push({ event: "token", data: { delta: FALLBACK_NETWORK_LINE } });
      events.push({ event: "done", data: { finish_reason: "error", turn: this.turn } });
    }

    return events;
  }

  private async runTurn(userText: string, context?: OrchestratorContext): Promise<SseEvent[]> {
    const events: SseEvent[] = [];
    const tools = this.allowedToolSpecs();

    const first = await this.llm.complete({
      messages: this.messages,
      tools,
      onToken: (delta) => events.push({ event: "token", data: { delta } }),
    });

    if (first.toolCalls.length > 0) {
      await this.executeToolCalls(first.toolCalls, events);
      const followUp = await this.llm.complete({
        messages: this.messages,
        tools,
        onToken: (delta) => events.push({ event: "token", data: { delta } }),
      });
      await this.guardAndReply(followUp.content, events);
    } else {
      await this.guardAndReply(first.content, events);
    }

    const next = decideNextState(this.state, this.signals, userText, context);
    if (canTransition(this.state, next)) this.state = next;

    events.push({ event: "done", data: { finish_reason: "stop", turn: this.turn } });
    return events;
  }

  private async executeToolCalls(
    toolCalls: { id: string; name: string; arguments: Record<string, unknown> }[],
    events: SseEvent[],
  ): Promise<void> {
    for (const rawCall of toolCalls.slice(0, this.maxToolCalls)) {
      const call: { id: string; name: ToolName; arguments: Record<string, unknown> } = {
        id: rawCall.id,
        name: rawCall.name as ToolName,
        arguments: rawCall.arguments,
      };
      events.push({ event: "tool_call", data: { tool: call.name, args: call.arguments } });

      const gate = validateToolCall(this.state, call.name, call.arguments);
      if (!gate.ok) {
        events.push({
          event: "tool_result",
          data: { tool: call.name, ok: false, error: "INVALID_PAYLOAD" },
        });
        continue;
      }

      if (!this.executor) {
        events.push({
          event: "tool_result",
          data: { tool: call.name, ok: false, error: "UPSTREAM_ERROR" },
        });
        continue;
      }

      const outcome = await this.executor(call.name, call.arguments);
      if (!outcome.ok) {
        events.push({
          event: "tool_result",
          data: { tool: call.name, ok: false, error: outcome.error ?? "UPSTREAM_ERROR" },
        });
        continue;
      }

      const resultCheck = validateToolResult(call.name, outcome.result);
      if (!resultCheck.ok) {
        events.push({
          event: "tool_result",
          data: { tool: call.name, ok: false, error: "INVALID_PAYLOAD" },
        });
        continue;
      }

      this.authorizedResults.push(outcome.result);
      events.push({
        event: "tool_result",
        data: { tool: call.name, ok: true, result: outcome.result },
      });
      this.attachResultEvents(call.name, outcome.result, events);
      if (outcome.signals) this.signals = { ...this.signals, ...outcome.signals };
    }
  }

  private attachResultEvents(
    tool: ToolName,
    result: unknown,
    events: SseEvent[],
  ): void {
    if (tool === "calculate_footprint") {
      events.push({ event: "datacard", data: result as never });
      return;
    }
    if (tool === "compare_alternatives") {
      events.push({ event: "compare", data: result as never });
      return;
    }
    if (tool === "log_commitment" && typeof result === "object" && result !== null) {
      const record = result as { commitment_id?: string };
      events.push({
        event: "commitment",
        data: { commitment_id: record.commitment_id ?? "cmt_unknown", suggested: true },
      });
    }
  }

  private async guardAndReply(replyText: string, events: SseEvent[]): Promise<void> {
    const authorized = buildAuthorizedFromToolResults(this.authorizedResults);
    let report = validateReply(replyText, authorized, this.guardContext);
    let action = nextGuardAction(0, report);

    if (action === "regenerate") {
      const retry = await this.llm.complete({
        messages: this.messages,
        tools: this.allowedToolSpecs(),
        onToken: (delta) => events.push({ event: "token", data: { delta } }),
      });
      replyText = retry.content;
      report = validateReply(replyText, authorized, this.guardContext);
      action = nextGuardAction(1, report);
    }

    if (report.blocked) {
      const category = report.issues.find((issue) => issue.category)?.category;
      replyText = category ? redirectLine(category) : DEGRADED_NEUTRAL_TEXT;
      this.state = "GUARDED";
    } else if (action === "degrade") {
      report = markDegraded(report);
      replyText = DEGRADED_NEUTRAL_TEXT;
    }

    replyText = stripUnregisteredUrls(replyText).text;
    this.lastGuardReport = report;
    this.messages.push({ role: "assistant", content: replyText });
  }

  /** Attach low-confidence context derived from the latest tool result. */
  setGuardContext(context: GuardContext): void {
    this.guardContext = context;
  }

  getAuthorizedResults(): unknown[] {
    return [...this.authorizedResults];
  }
}

/** Local name set mirroring the frozen ToolName union. */
const TOOL_NAME_SET: Record<ToolName, true> = {
  extract_product_attributes: true,
  map_to_category: true,
  get_emission_factors: true,
  calculate_footprint: true,
  compare_alternatives: true,
  rank_by_5r: true,
  log_commitment: true,
};
