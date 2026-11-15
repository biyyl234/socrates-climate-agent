/**
 * POST /chat — SSE conversation stream (report §3.4).
 *
 * Orchestration, MI state machine, guards and the LLM adapter factory come from
 * @socrates/core; the deterministic executor in ./shared binds the data engine.
 * When no LLM key is present the factory selects the offline Mock adapter, so
 * the full event sequence still runs end to end.
 */

import {
  createLlmAdapter,
  encodeSse,
  MiOrchestrator,
  MockLlm,
  validateChatRequest,
  type OrchestratorContext,
  type SseEvent,
} from "@socrates/core";
import {
  CORS_HEADERS,
  envObject,
  errorResponse,
  preflightResponse,
  readJsonBody,
} from "../shared/http";
import { createToolExecutor } from "../shared/executor";

/** Scripted offline flow for the Mock LLM: exercises real tools + data engine. */
function seedMock(llm: MockLlm, message: string): void {
  const isCompare = /哪个|对比|比较|vs|VS|区别|替代|还是/.test(message);
  if (isCompare && /肉|牛肉|beef/i.test(message)) {
    llm.enqueue({
      toolCalls: [
        {
          id: "c1",
          name: "calculate_footprint",
          arguments: {
            category_id: "meal_beef",
            attributes: { portion_g: 350, geography: "CN" },
            quantity: 1,
            unit: "meal",
          },
        },
        {
          id: "c2",
          name: "compare_alternatives",
          arguments: {
            items: [
              { label: "牛肉套餐", category_id: "meal_beef", attributes: { portion_g: 350 } },
              { label: "素食套餐", category_id: "meal_veggie", attributes: { portion_g: 350 } },
            ],
          },
        },
      ],
    });
    llm.enqueue({
      content:
        "两份套餐已按同一功能单位核对，区间与对比结论已挂载到信息卡；我们先看看你愿意尝试的小改变。",
    });
    return;
  }
  if (/水|瓶|饮料|snack|零食/.test(message)) {
    llm.enqueue({
      toolCalls: [
        { id: "c1", name: "extract_product_attributes", arguments: { free_text: message } },
      ],
    });
    llm.enqueue({
      content:
        "我先记录下你说的产品；方便补充品牌、配料或包装规格吗，这样可以匹配到更合适的本地因子。",
    });
    return;
  }
  llm.enqueue({
    content: "听起来你在留意日常选择；方便说说最近一次在食堂或便利店的购买场景吗？",
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "POST") {
    return errorResponse("INVALID_PAYLOAD", "Method not allowed; use POST", [{ field: "method", reason: "expected POST" }]);
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return errorResponse("INVALID_PAYLOAD", "请求体不满足 schema", body.issues);
  }

  const validation = validateChatRequest(body.value);
  if (!validation.ok) {
    return errorResponse("INVALID_PAYLOAD", "请求字段不满足 schema", validation.issues);
  }

  const raw = body.value as {
    session_id?: string;
    message: string;
    locale?: string;
    mode?: "assisted" | "demo";
    context?: { entry_scene?: string; product_hint?: string | null };
  };

  const env = envObject();
  const llm = createLlmAdapter({}, env);
  if (llm instanceof MockLlm) seedMock(llm, raw.message);

  const sessionId =
    raw.session_id ?? `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const context: OrchestratorContext = {
    entryScene: raw.context?.entry_scene,
    productHint: raw.context?.product_hint ?? null,
  };

  const orchestrator = new MiOrchestrator({
    llm,
    executor: createToolExecutor({ env, sessionId }),
    sessionId,
    locale: raw.locale,
    mode: raw.mode,
  });

  let events: SseEvent[];
  try {
    events = await orchestrator.handleUserMessage(raw.message, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    events = [
      { event: "error", data: { code: "INTERNAL", message } },
      { event: "done", data: { finish_reason: "error", turn: orchestrator.turn } },
    ];
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(encodeSse(event)));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
