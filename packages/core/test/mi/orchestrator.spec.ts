import { describe, expect, it } from "vitest";
import { MockLlm, type MockScriptedReply } from "../../src/adapters/llm";
import {
  MiOrchestrator,
  type ToolExecutor,
} from "../../src/mi/orchestrator";
import { DEGRADED_NEUTRAL_TEXT } from "../../src/guards";

const compareResult = {
  functional_unit: "1 份标准套餐（350 g）",
  items: [
    {
      index: 0,
      label: "牛肉套餐",
      footprint: { value: 4.86, unit: "kgCO2e", interval: [3.62, 6.1] },
      dq: "B",
    },
    {
      index: 1,
      label: "素食套餐",
      footprint: { value: 1.72, unit: "kgCO2e", interval: [1.28, 2.2] },
      dq: "B",
    },
  ],
  overlap: false,
  caveats: ["区间存在重叠时不宣称绝对优劣"],
};

const clarificationResult = {
  category_id: "other",
  category_path: ["other"],
  mapped: false,
  match_confidence: 0.4,
  alternatives: [],
  need_clarification: true,
  clarification_question: "方便说说产品名称、配料或包装规格吗？",
};

function buildOrchestrator(executor: ToolExecutor, replies: MockScriptedReply[] = []) {
  const llm = new MockLlm();
  for (const reply of replies) llm.enqueue(reply);
  return new MiOrchestrator({ llm, executor, sessionId: "sess_test" });
}

describe("MI orchestrator end-to-end (offline mock)", () => {
  it("runs a compare flow: state, tool_call, tool_result, compare, token, done", async () => {
    const executor: ToolExecutor = async (tool) => {
      if (tool === "compare_alternatives") {
        return { ok: true, result: compareResult, signals: { nextState: "DECISION" } };
      }
      return { ok: false, error: "PRODUCT_NOT_FOUND" };
    };

    const orchestrator = buildOrchestrator(executor, [
      { content: "听起来你在食堂用餐。" },
      {
        toolCalls: [
          {
            id: "tc_1",
            name: "compare_alternatives",
            arguments: {
              items: [
                { label: "牛肉套餐", category_id: "meal_beef" },
                { label: "素食套餐", category_id: "meal_veggie" },
              ],
            },
          },
        ],
      },
      { content: "在同一份套餐口径下，素菜饭区间整体更低。" },
    ]);

    const first = await orchestrator.handleUserMessage("你好，我在食堂");
    expect(first.some((e) => e.event === "state")).toBe(true);
    expect(first.some((e) => e.event === "done")).toBe(true);

    const second = await orchestrator.handleUserMessage("牛肉饭和素菜饭哪个低碳");
    const eventNames = second.map((e) => e.event);
    expect(eventNames).toContain("tool_call");
    expect(eventNames).toContain("tool_result");
    expect(eventNames).toContain("compare");
    expect(eventNames).toContain("token");
    expect(orchestrator.state).toBe("DECISION");
  });

  it("routes a hard sensitive topic to GUARDED and blocks the turn", async () => {
    const executor: ToolExecutor = async () => ({ ok: false, error: "UPSTREAM_ERROR" });
    const orchestrator = buildOrchestrator(executor, []);

    const events = await orchestrator.handleUserMessage("用政治立场评价这个国家的排放政策");
    const eventNames = events.map((e) => e.event);
    expect(eventNames).toContain("state");
    const done = events.find((e) => e.event === "done");
    expect(done?.event === "done" && done.data.finish_reason).toBe("blocked");
    expect(orchestrator.state).toBe("RAPPORT");
  });

  it("returns to RAPPORT when mapping confidence is below 0.6", async () => {
    const executor: ToolExecutor = async (tool) => {
      if (tool === "map_to_category") {
        return {
          ok: true,
          result: clarificationResult,
          signals: { needClarification: true, confidence: 0.4 },
        };
      }
      return { ok: false, error: "PRODUCT_NOT_FOUND" };
    };

    const orchestrator = buildOrchestrator(executor, [
      { content: "你最近一次在食堂选了什么？" },
      {
        toolCalls: [
          {
            id: "tc_2",
            name: "map_to_category",
            arguments: {
              attributes: {
                product_name: "进口零食",
                brand: null,
                category_hint: "snack",
                ingredients: ["糖"],
                package_format: "bag",
                confidence: 0.4,
              },
            },
          },
        ],
      },
      { content: "方便说说产品名称、配料或包装规格吗？" },
    ]);

    await orchestrator.handleUserMessage("你好");
    await orchestrator.handleUserMessage("我选了一款进口零食，配了可乐");
    expect(orchestrator.state).toBe("RAPPORT");
  });

  it("degrades to the neutral datacard message after a second guard failure", async () => {
    const executor: ToolExecutor = async () => ({ ok: false, error: "UPSTREAM_ERROR" });
    const orchestrator = buildOrchestrator(executor, [
      { content: "2.5 kgCO2e，这是我编的数字。" },
      { content: "2.5 kgCO2e，仍然没有来源。" },
    ]);

    await orchestrator.handleUserMessage("这个产品排碳多少");
    expect(orchestrator.lastGuardReport?.degraded).toBe(true);
    const lastMessage = orchestrator.messages[orchestrator.messages.length - 1];
    expect(lastMessage?.content).toBe(DEGRADED_NEUTRAL_TEXT);
  });

  it("emits a tool_result error when the tool is not allowed in the current state", async () => {
    const executor: ToolExecutor = async () => ({ ok: true, result: compareResult });
    const orchestrator = buildOrchestrator(executor, [
      {
        toolCalls: [
          { id: "tc_3", name: "log_commitment", arguments: { commitment_text: "x" } },
        ],
      },
      { content: "我们先聊聊场景。" },
    ]);

    const events = await orchestrator.handleUserMessage("记一个承诺");
    const toolResult = events.find((e) => e.event === "tool_result");
    expect(toolResult?.event === "tool_result" && toolResult.data.ok).toBe(false);
  });
});
