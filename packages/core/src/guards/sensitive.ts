/**
 * First-version topic guard (report §7.4: keyword list; classifier reserved).
 * Hard hits route to GUARDED; soft hits are redirected back to campus
 * consumption choices without expanding the sensitive subject.
 */

export type GuardTopicCategory =
  | "privacy"
  | "weight_body"
  | "health_anxiety"
  | "religion"
  | "ethnicity"
  | "politics"
  | "advertising"
  | "commercial_eval"
  | "nutrition_medical"
  | "self_harm";

export interface SensitiveHit {
  category: GuardTopicCategory;
  matched: string;
  /** Hard topics must route to GUARDED; soft ones are redirected neutrally. */
  hard: boolean;
}

interface TopicRule {
  category: GuardTopicCategory;
  hard: boolean;
  keywords: RegExp[];
}

const RULES: TopicRule[] = [
  {
    category: "politics",
    hard: true,
    keywords: [/政治/, /政党/, /领导人/, /国家政策/, /政策评价/, /政府政策/],
  },
  {
    category: "religion",
    hard: true,
    keywords: [/宗教/, /信仰/, /教会/, /寺庙/],
  },
  {
    category: "ethnicity",
    hard: true,
    keywords: [/民族/, /种族/, /族群/],
  },
  {
    category: "privacy",
    hard: true,
    keywords: [/手机号/, /身份证/, /家庭住址/, /银行卡号/, /密码/],
  },
  {
    category: "self_harm",
    hard: true,
    keywords: [/自杀/, /自残/, /伤害自己/, /不想活/, /轻生/],
  },
  {
    category: "weight_body",
    hard: false,
    keywords: [/体重/, /胖/, /减肥/, /身材/, /长胖/],
  },
  {
    category: "health_anxiety",
    hard: false,
    keywords: [/健康焦虑/, /抑郁/, /焦虑/, /心理疾病/, /自责/],
  },
  {
    category: "advertising",
    hard: false,
    keywords: [/广告/, /带货/, /品牌代言/, /推荐购买/],
  },
  {
    category: "commercial_eval",
    hard: false,
    keywords: [/漂绿/, /洗绿/, /是不是在洗白/, /品牌是不是/],
  },
  {
    category: "nutrition_medical",
    hard: false,
    keywords: [/健康得多/, /营养诊断/, /疗效/, /疾病/, /医学判断/],
  },
];

export function classifySensitive(text: string): SensitiveHit[] {
  const hits: SensitiveHit[] = [];
  for (const rule of RULES) {
    for (const pattern of rule.keywords) {
      const match = text.match(pattern);
      if (match) {
        hits.push({ category: rule.category, matched: match[0] ?? pattern.source, hard: rule.hard });
        break;
      }
    }
  }
  return hits;
}

/** Neutral redirect line per topic; no expansion of the sensitive subject. */
export function redirectLine(category: GuardTopicCategory): string {
  switch (category) {
    case "politics":
    case "religion":
    case "ethnicity":
      return "这个话题不在我们今天校园消费选择的范围里，我们回到餐食或包装上来吧。";
    case "privacy":
      return "我们不需要填写个人隐私信息，回到今天的餐食或包装选择上吧。";
    case "self_harm":
      return "如果你现在很难受，可以联系身边可信任的人或通用心理援助渠道；我们先停下这个话题。";
    case "weight_body":
    case "health_anxiety":
    case "nutrition_medical":
      return "我们先不评价身体与健康状态，回到餐食选择对环境的方向上来。";
    case "advertising":
    case "commercial_eval":
      return "我们不评价品牌，只聊你自己可以做的小选择。";
  }
}
