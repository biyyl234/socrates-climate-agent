/**
 * Orchestrator contracts: tool execution outcomes carry the deterministic
 * signals the state machine consumes (confidence, clarification, commitment).
 */

import type { MIState, ToolName } from "../states";
import type { ChatErrorCode } from "../../protocol/sse-events";

export interface OrchestratorSignals {
  nextState?: MIState;
  confidence?: number;
  needClarification?: boolean;
  commitmentMade?: boolean;
  recoveredState?: MIState;
  reason?: string;
}

export interface ToolExecutionOutcome {
  ok: boolean;
  result?: unknown;
  error?: ChatErrorCode;
  signals?: OrchestratorSignals;
}

export type ToolExecutor = (
  tool: ToolName,
  args: Record<string, unknown>,
) => Promise<ToolExecutionOutcome>;

export interface OrchestratorContext {
  entryScene?: string;
  productHint?: string | null;
}

// Re-export to keep this module self-contained.
export type { MIState } from "../states";
