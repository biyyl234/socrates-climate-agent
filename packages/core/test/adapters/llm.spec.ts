import { describe, expect, it, vi } from "vitest";
import {
  createLlmAdapter,
  MockLlm,
  OpenAICompatibleLlm,
  LlmError,
} from "../../src/adapters/llm";

describe("MockLlm offline adapter", () => {
  it("returns scripted content, forwards token deltas and tool calls", async () => {
    const llm = new MockLlm([
      {
        content: "听起来你在比较两份套餐。",
        toolCalls: [{ id: "tc_1", name: "map_to_category", arguments: { product: "x" } }],
      },
    ]);
    const deltas: string[] = [];
    const result = await llm.complete({
      messages: [{ role: "user", content: "牛肉饭还是素菜饭" }],
      onToken: (delta) => deltas.push(delta),
    });
    expect(result.content).toBe("听起来你在比较两份套餐。");
    expect(result.toolCalls).toHaveLength(1);
    expect(deltas.join("")).toBe(result.content);
  });

  it("falls back to regex-matched replies when queue is empty", async () => {
    const llm = new MockLlm([{ match: /素食/, content: "偏好植物源菜品。" }]);
    const result = await llm.complete({ messages: [{ role: "user", content: "我想选素食" }] });
    expect(result.content).toBe("偏好植物源菜品。");
  });
});

describe("LLM factory", () => {
  it("defaults to the offline mock when no provider or key is configured", () => {
    const adapter = createLlmAdapter({}, {});
    expect(adapter.provider).toBe("mock");
    expect(adapter).toBeInstanceOf(MockLlm);
  });

  it("selects a real provider from injected config", () => {
    const adapter = createLlmAdapter({
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com",
      apiKey: "test-key",
      model: "deepseek-chat",
    });
    expect(adapter).toBeInstanceOf(OpenAICompatibleLlm);
    expect(adapter.provider).toBe("deepseek");
  });
});

describe("OpenAI-compatible adapter", () => {
  it("throws a clear missing-credentials error without an API key", () => {
    expect(
      () =>
        new OpenAICompatibleLlm({
          provider: "deepseek",
          baseUrl: "https://api.deepseek.com",
          apiKey: "",
          model: "deepseek-chat",
        }),
    ).toThrow(LlmError);
  });

  it("parses a successful upstream payload and forwards tokens", async () => {
    const fakeFetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              role: "assistant",
              content: "你好，我们先看看套餐差异。",
              tool_calls: [
                {
                  id: "tc_9",
                  type: "function",
                  function: { name: "map_to_category", arguments: '{"x":1}' },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
        usage: { prompt_tokens: 12, completion_tokens: 9, total_tokens: 21 },
      }),
    })) as unknown as typeof fetch;

    const llm = new OpenAICompatibleLlm({
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com",
      apiKey: "test-key",
      model: "deepseek-chat",
      fetchImpl: fakeFetch,
    });

    const deltas: string[] = [];
    const result = await llm.complete({
      messages: [{ role: "user", content: "你好" }],
      onToken: (d) => deltas.push(d),
    });
    expect(result.content).toBe("你好，我们先看看套餐差异。");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.arguments).toEqual({ x: 1 });
    expect(result.finishReason).toBe("tool_calls");
    expect(result.usage?.totalTokens).toBe(21);
    expect(deltas.join("")).toBe(result.content);
  });

  it("maps a 401 response to an auth error", async () => {
    const fakeFetch = (async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: "bad token" }),
    })) as unknown as typeof fetch;
    const llm = new OpenAICompatibleLlm({
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "bad",
      model: "gpt-demo",
      fetchImpl: fakeFetch,
    });
    await expect(
      llm.complete({ messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow(LlmError);
  });

  it("invokes the token callback even with an empty reply", async () => {
    const spy = vi.fn();
    const fakeFetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "" }, finish_reason: "stop" }] }),
    })) as unknown as typeof fetch;
    const llm = new OpenAICompatibleLlm({
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "k",
      model: "m",
      fetchImpl: fakeFetch,
    });
    await llm.complete({ messages: [{ role: "user", content: "hi" }], onToken: spy });
    expect(spy).toHaveBeenCalledWith("");
  });

  it("retries after its own per-attempt timeout and then succeeds", async () => {
    let calls = 0;
    const fakeFetch = (async (_url: unknown, init: { signal: AbortSignal }) => {
      calls += 1;
      if (calls === 1) {
        // Mimic real fetch: reject with AbortError once the timer aborts.
        await new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: { role: "assistant", content: "重试成功" },
              finish_reason: "stop",
            },
          ],
        }),
      };
    }) as unknown as typeof fetch;

    const llm = new OpenAICompatibleLlm({
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "k",
      model: "m",
      fetchImpl: fakeFetch,
    });

    const result = await llm.complete({
      messages: [{ role: "user", content: "hi" }],
      timeoutMs: 50,
    });
    expect(calls).toBe(2);
    expect(result.content).toBe("重试成功");
  });

  it("does not retry when the caller aborts from outside", async () => {
    let calls = 0;
    const fakeFetch = (async (_url: unknown, init: { signal: AbortSignal }) => {
      calls += 1;
      await new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
      return { ok: true };
    }) as unknown as typeof fetch;

    const llm = new OpenAICompatibleLlm({
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "k",
      model: "m",
      fetchImpl: fakeFetch,
    });

    const outer = new AbortController();
    const pending = llm.complete({
      messages: [{ role: "user", content: "hi" }],
      signal: outer.signal,
      timeoutMs: 5000,
    });
    setTimeout(() => outer.abort(), 30);

    await expect(pending).rejects.toThrow(LlmError);
    expect(calls).toBe(1);
  });
});
