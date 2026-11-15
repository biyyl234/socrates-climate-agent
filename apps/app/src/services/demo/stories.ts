/**
 * Offline demo stories. Scripted MI flow aligned to report §2.5; every numeric
 * card comes from the deterministic @socrates/data engine — no hard-coded
 * footprint values are authored here. When the backend is unreachable the chat
 * screen replays this script as a local SSE-like sequence.
 */
import type { AvatarState, ExpressionId, MIState, MotionId } from "@socrates/core";
import type { CompareResult, FootprintResult } from "@socrates/data";
import type { CommitmentSuggestion, StoryId } from "../../types/chat";
import { mealCompare, waterCompare, waterFootprint } from "../engine";

export interface DemoStep {
  miState: MIState;
  avatarState: AvatarState;
  expression?: ExpressionId;
  motion?: MotionId;
  text: string;
  toolCall?: { tool: string; args: Record<string, unknown> };
  datacard: FootprintResult | null;
  compare: CompareResult | null;
  commitment: CommitmentSuggestion | null;
}

const waterCard = waterFootprint();
const waterAlt = waterCompare();
const mealAlt = mealCompare();

const WATER_SCRIPT: DemoStep[] = [
  {
    miState: "RAPPORT",
    avatarState: "Listening",
    expression: "exp-smile",
    motion: "m-idle-breath",
    text: "你好，我是苏格拉底。不急着下判断——今天想先聊聊哪一餐，还是哪一瓶水？",
    datacard: null,
    compare: null,
    commitment: null,
  },
  {
    miState: "RAPPORT",
    avatarState: "Listening",
    expression: "exp-listen",
    motion: "m-nod",
    text: "听起来你正在想，这瓶水背后有没有什么值得注意的地方。",
    datacard: null,
    compare: null,
    commitment: null,
  },
  {
    miState: "FACT_SHARING",
    avatarState: "Thinking",
    expression: "exp-think",
    text: "我们先按一瓶标准 500 mL 瓶装水来看，数据分阶段列给你，区间比单一数字更诚实。",
    toolCall: { tool: "calculate_footprint", args: { category_id: "bottled_water", quantity: 1, unit: "bottle" } },
    datacard: waterCard,
    compare: null,
    commitment: null,
  },
  {
    miState: "FACT_SHARING",
    avatarState: "Speaking",
    expression: "exp-neutral",
    motion: "m-point-card",
    text: "这里最大的一块通常来自包装与运输，而不是水本身；数字带了区间，来源和质量等级都写在卡片上。",
    datacard: null,
    compare: null,
    commitment: null,
  },
  {
    miState: "DECISION",
    avatarState: "Affirm",
    expression: "exp-affirm",
    motion: "m-nod",
    text: "买水对你来说是方便，这很实在；想不想看看，如果换一种选择，大概会差多少？",
    datacard: null,
    compare: null,
    commitment: null,
  },
  {
    miState: "DECISION",
    avatarState: "Speaking",
    expression: "exp-invite",
    motion: "m-palm-up",
    text: "一个常见替代是接直饮水或自带水杯：省去瓶身与回收环节；运输距离和你的使用习惯仍会影响结果，所以这里也给区间。",
    datacard: null,
    compare: waterAlt,
    commitment: null,
  },
  {
    miState: "COMMITMENT",
    avatarState: "Affirm",
    expression: "exp-invite",
    motion: "m-palm-up",
    text: "你愿意把“下次自带水杯”记成一个小承诺吗？不勉强，今天先了解也很好。",
    datacard: null,
    compare: null,
    commitment: {
      text: "下次买水时自带水杯",
      categoryId: "bottled_water",
      alternative: "直饮水 / 自带水杯",
      barrier: "出门前忘记带杯",
      plan: "把水杯放在书包侧袋，作为固定位置",
    },
  },
  {
    miState: "CLOSING",
    avatarState: "Celebrate",
    expression: "exp-celebrate",
    motion: "m-raise-hand",
    text: "记下了。从一瓶水开始，这个选择已经很清楚。",
    datacard: null,
    compare: null,
    commitment: null,
  },
  {
    miState: "CLOSING",
    avatarState: "Idle",
    expression: "exp-smile",
    motion: "m-idle-breath",
    text: "想继续聊零食、饮料或快递包装，随时告诉我；这次聊到这里也完全可以。",
    datacard: null,
    compare: null,
    commitment: null,
  },
];

const BEEF_SCRIPT: DemoStep[] = [
  {
    miState: "RAPPORT",
    avatarState: "Listening",
    expression: "exp-smile",
    motion: "m-palm-up",
    text: "我们从食堂这一餐开始聊吧。你平时午餐一般怎么选？",
    datacard: null,
    compare: null,
    commitment: null,
  },
  {
    miState: "RAPPORT",
    avatarState: "Listening",
    expression: "exp-listen",
    motion: "m-nod",
    text: "你在考虑换一种午餐，又不想被催着做决定。",
    datacard: null,
    compare: null,
    commitment: null,
  },
  {
    miState: "FACT_SHARING",
    avatarState: "Thinking",
    expression: "exp-think",
    text: "我们按“一餐、标准份”同口径对比牛肉餐和素食餐，阶段拆开看。",
    toolCall: { tool: "compare_alternatives", args: { items: ["meal_beef", "meal_veggie"] } },
    datacard: null,
    compare: mealAlt,
    commitment: null,
  },
  {
    miState: "DECISION",
    avatarState: "Speaking",
    expression: "exp-neutral",
    motion: "m-point-card",
    text: "差异主要集中在原料环节；这是平均区间，不代表你学校窗口的每份具体餐品。",
    datacard: null,
    compare: null,
    commitment: null,
  },
  {
    miState: "DECISION",
    avatarState: "Affirm",
    expression: "exp-affirm",
    motion: "m-nod",
    text: "喜欢吃肉不是问题；我们可以看低门槛的替代，比如半荤半素、小份，或明天试一次素食窗口。",
    datacard: null,
    compare: null,
    commitment: null,
  },
  {
    miState: "COMMITMENT",
    avatarState: "Affirm",
    expression: "exp-invite",
    motion: "m-palm-up",
    text: "如果愿意，可以先记一个最小的承诺：下一餐选一次素食窗口。",
    datacard: null,
    compare: null,
    commitment: {
      text: "下一餐选一次素食窗口",
      categoryId: "meal_veggie",
      alternative: "素食餐（标准份）",
      barrier: "不确定口味是否合口",
      plan: "先选半荤半素或小份试一次",
    },
  },
  {
    miState: "CLOSING",
    avatarState: "Celebrate",
    expression: "exp-celebrate",
    motion: "m-raise-hand",
    text: "记下了。从下一餐开始，你已经在观察自己的选择了。",
    datacard: null,
    compare: null,
    commitment: null,
  },
  {
    miState: "CLOSING",
    avatarState: "Idle",
    expression: "exp-smile",
    motion: "m-idle-breath",
    text: "想继续聊零食、饮料或快递包装，随时告诉我；这次聊到这里也完全可以。",
    datacard: null,
    compare: null,
    commitment: null,
  },
];

export const DEMO_SCRIPTS: Record<StoryId, DemoStep[]> = {
  water: WATER_SCRIPT,
  beef: BEEF_SCRIPT,
};

/** Polite fallback for out-of-scope or off-script questions (GUARDED state). */
export const FALLBACK_STEP: DemoStep = {
  miState: "GUARDED",
  avatarState: "Fallback",
  expression: "exp-apology",
  motion: "m-gentle-shake",
  text: "这个问题超出我们这次聊天的范围，我们回到饮食与日常选择上吧。",
  datacard: null,
  compare: null,
  commitment: null,
};

export function getDemoScript(storyId: StoryId): DemoStep[] {
  return DEMO_SCRIPTS[storyId];
}
