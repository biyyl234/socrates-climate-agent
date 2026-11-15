/** App-level chat domain types (UI layer over the frozen SSE/data contracts). */
import type { MIState, ExpressionId, MotionId, AvatarState } from "@socrates/core";
import type { CompareResult, FootprintResult } from "@socrates/data";

export interface CommitmentSuggestion {
  text: string;
  categoryId: string;
  alternative: string;
  barrier?: string | null;
  plan?: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  miState: MIState;
  avatarState: AvatarState;
  expression?: ExpressionId;
  motion?: MotionId;
  datacard: FootprintResult | null;
  compare: CompareResult | null;
  commitmentSuggestion: CommitmentSuggestion | null;
  createdAt: number;
  /** True while the assistant text is still streaming in. */
  streaming: boolean;
}

export interface ToolCallView {
  tool: string;
  args: Record<string, unknown>;
}

export interface CommitmentRecord {
  id: string;
  text: string;
  categoryId: string;
  alternative: string;
  barrier?: string | null;
  plan?: string | null;
  createdAt: string;
  followUpDue: string | null;
  status: "active" | "cancelled";
  source: "local" | "backend";
}

export const MI_STATE_LABELS: Record<MIState, string> = {
  WELCOME: "欢迎",
  RAPPORT: "建立关系",
  DISCOVERY: "了解情况",
  FACT_SHARING: "事实分享",
  DECISION: "共同决策",
  COMMITMENT: "承诺",
  CLOSING: "收束",
  GUARDED: "边界回退",
  FALLBACK: "兜底",
};

export type StoryId = "water" | "beef";

export const STORY_META: Record<
  StoryId,
  { title: string; subtitle: string; scene: string; chips: string[] }
> = {
  water: {
    title: "瓶装水 vs 直饮水",
    subtitle: "1 瓶 500 mL 标准瓶：阶段拆解与自带水杯替代",
    scene: "便利店 / 校园饮水",
    chips: ["我刚在便利店买了一瓶瓶装水", "想看看自带水杯大概差多少"],
  },
  beef: {
    title: "牛肉餐 vs 素食餐",
    subtitle: "1 份标准食堂套餐：同口径对比与低门槛替代",
    scene: "食堂午餐",
    chips: ["今天点了牛肉饭，明天可能想换", "想看看素食窗口大概差多少"],
  },
};
