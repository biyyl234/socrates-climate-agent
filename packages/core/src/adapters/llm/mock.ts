/**
 * Offline mock LLM for demo mode and tests. No network, no credentials: replies
 * are scripted in advance (FIFO queue, optional regex match against the latest
 * user message). The orchestrator drives the same SSE event sequence against
 * this adapter as against a real provider.
 */

import type {
  ChatMessage,
  CompletionFinishReason,
  CompletionOptions,
  CompletionResult,
  LlmAdapter,
  ToolCall,
} from "./types";

export interface MockScriptedReply {
  /** Regex matched against the latest user message when the queue is empty. */
  match?: RegExp;
  content?: string;
  toolCalls?: ToolCall[];
  finishReason?: CompletionFinishReason;
}

/** Split text into short natural-language chunks to exercise the token callback. */
export function splitForStreaming(text: string): string[] {
  if (text.length === 0) return [];
  const sentences = text.match(/[^。！？!?；;]+[。！？!?；;]?/g) ?? [text];
  const chunks: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= 24) {
      chunks.push(sentence);
    } else {
      for (let i = 0; i < sentence.length; i += 24) {
        chunks.push(sentence.slice(i, i + 24));
      }
    }
  }
  return chunks;
}

function latestUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg?.role === "user") return msg.content;
  }
  return "";
}

export class MockLlm implements LlmAdapter {
  readonly provider = "mock";
  private queue: MockScriptedReply[];

  constructor(replies: MockScriptedReply[] = []) {
    this.queue = [...replies];
  }

  enqueue(reply: MockScriptedReply): void {
    this.queue.push(reply);
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const userText = latestUserMessage(options.messages);
    let reply = this.queue.shift();
    if (!reply) {
      reply = this.queue.find((candidate) => candidate.match?.test(userText));
    }

    const content = reply?.content ?? "";
    const toolCalls = reply?.toolCalls ?? [];

    for (const chunk of splitForStreaming(content)) {
      options.onToken?.(chunk);
    }

    return {
      content,
      toolCalls,
      finishReason: toolCalls.length > 0 ? "tool_calls" : (reply?.finishReason ?? "stop"),
      usage: { promptTokens: 0, completionTokens: content.length, totalTokens: content.length },
      raw: { mock: true, reply },
    };
  }
}
