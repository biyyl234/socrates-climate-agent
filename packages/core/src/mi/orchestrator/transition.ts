/**
 * State transition decisions (report §6.2). Executor signals win over the
 * first-version keyword heuristic; invalid transitions fall back to the
 * current state rather than throwing.
 */

import { canTransition, type MIState } from "../states";
import type { OrchestratorContext, OrchestratorSignals } from "./types";

const PRODUCT_KEYWORD_RE =
  /餐|饭|肉|菜|水|瓶|罐|零食|可乐|饮料|包装|袋|盒|杯|果汁|奶|小吃/;

export function detectProductMention(text: string, context?: OrchestratorContext): boolean {
  if (context?.productHint) return true;
  return PRODUCT_KEYWORD_RE.test(text);
}

export function decideNextState(
  state: MIState,
  signals: OrchestratorSignals,
  userText: string,
  context?: OrchestratorContext,
): MIState {
  // Explicit override from a deterministic tool result. A same-state signal
  // keeps the current stage; other overrides must pass the frozen transition gate.
  if (signals.nextState) {
    if (signals.nextState === state) return state;
    if (canTransition(state, signals.nextState)) return signals.nextState;
  }

  switch (state) {
    case "WELCOME":
      return "RAPPORT";

    case "RAPPORT":
      return detectProductMention(userText, context) ? "DISCOVERY" : "RAPPORT";

    case "DISCOVERY": {
      const lowConfidence =
        signals.confidence !== undefined && signals.confidence < 0.6;
      if (signals.needClarification || lowConfidence) return "RAPPORT";
      return "FACT_SHARING";
    }

    case "FACT_SHARING":
      return "DECISION";

    case "DECISION":
      return signals.commitmentMade ? "COMMITMENT" : "CLOSING";

    case "COMMITMENT":
      return "CLOSING";

    case "GUARDED":
      return "RAPPORT";

    case "FALLBACK":
      return signals.recoveredState ?? "RAPPORT";

    case "CLOSING":
      return "CLOSING";

    default:
      return state;
  }
}
