// ../core/src/mi/states.ts
var ALLOWED_TOOLS = {
  WELCOME: [],
  RAPPORT: [],
  DISCOVERY: ["extract_product_attributes", "map_to_category", "get_emission_factors"],
  FACT_SHARING: ["get_emission_factors", "calculate_footprint"],
  DECISION: ["compare_alternatives", "rank_by_5r", "calculate_footprint"],
  COMMITMENT: ["log_commitment"],
  CLOSING: [],
  GUARDED: [],
  FALLBACK: []
};
function isToolAllowed(state, tool) {
  return ALLOWED_TOOLS[state].includes(tool);
}
var TRANSITIONS = {
  WELCOME: ["RAPPORT", "GUARDED", "FALLBACK"],
  RAPPORT: ["DISCOVERY", "GUARDED", "FALLBACK"],
  DISCOVERY: ["FACT_SHARING", "RAPPORT", "GUARDED", "FALLBACK"],
  FACT_SHARING: ["DECISION", "GUARDED", "FALLBACK"],
  DECISION: ["COMMITMENT", "CLOSING", "GUARDED", "FALLBACK"],
  COMMITMENT: ["CLOSING", "GUARDED", "FALLBACK"],
  CLOSING: ["FALLBACK"],
  GUARDED: ["RAPPORT", "CLOSING"],
  FALLBACK: ["WELCOME", "RAPPORT", "DISCOVERY", "FACT_SHARING", "DECISION", "CLOSING"]
};
function canTransition(from, to) {
  return TRANSITIONS[from].includes(to);
}

// ../core/src/protocol/sse-events.ts
function encodeSse(evt) {
  return `event: ${evt.event}
data: ${JSON.stringify(evt.data)}

`;
}

// ../core/src/protocol/request-validation.ts
var MODES = /* @__PURE__ */ new Set(["assisted", "demo"]);
function validateChatRequest(raw) {
  const issues = [];
  if (typeof raw !== "object" || raw === null) {
    return {
      ok: false,
      issues: [{ field: "body", reason: "request body must be a JSON object" }],
      error: "INVALID_PAYLOAD"
    };
  }
  const body = raw;
  if (typeof body.message !== "string" || body.message.length === 0) {
    issues.push({ field: "message", reason: "message is required" });
  } else if (body.message.length > 1e3) {
    issues.push({ field: "message", reason: "message exceeds 1000 characters" });
  }
  if (body.locale !== void 0 && typeof body.locale !== "string") {
    issues.push({ field: "locale", reason: "locale must be a string" });
  }
  if (body.mode !== void 0 && !MODES.has(body.mode)) {
    issues.push({ field: "mode", reason: "mode must be 'assisted' or 'demo'" });
  }
  if (body.context !== void 0 && typeof body.context !== "object") {
    issues.push({ field: "context", reason: "context must be an object" });
  }
  return {
    ok: issues.length === 0,
    issues,
    error: issues.length > 0 ? "INVALID_PAYLOAD" : void 0
  };
}

// ../core/src/tokens/design-tokens.ts
var palette = {
  // Light mode
  primary: "#2F5D50",
  primaryStrong: "#24483E",
  primarySoft: "#E4EDE8",
  secondary: "#C97B5A",
  secondarySoft: "#F6E7DF",
  sage: "#9DB8A3",
  sand: "#E8DFCF",
  bg: "#F7F3EA",
  surface: "#FFFFFF",
  surfaceAlt: "#F1EBDD",
  textPrimary: "#1F2A26",
  textSecondary: "#56645E",
  textTertiary: "#8A968F",
  textDisabled: "#B9C2BD",
  border: "#D9D2C4",
  success: "#3E8E6E",
  warning: "#C98A2D",
  danger: "#B5504A",
  info: "#4A7FA6",
  // Dark mode
  bgDark: "#141B18",
  surfaceDark: "#1D2622",
  surfaceAltDark: "#26312C",
  primaryDark: "#7FAF9E",
  secondaryDark: "#D99A7E",
  textPrimaryDark: "#E9EFEB",
  textSecondaryDark: "#AEB9B3",
  borderDark: "#38443E",
  successDark: "#6BB593",
  warningDark: "#E0A955",
  dangerDark: "#D4736C",
  infoDark: "#7FA8C9"
};
var colorTokens = {
  light: {
    "color-primary": palette.primary,
    "color-primary-strong": palette.primaryStrong,
    "color-primary-soft": palette.primarySoft,
    "color-secondary": palette.secondary,
    "color-secondary-soft": palette.secondarySoft,
    "color-accent-sage": palette.sage,
    "color-sand": palette.sand,
    "color-bg": palette.bg,
    "color-surface": palette.surface,
    "color-surface-alt": palette.surfaceAlt,
    "color-text-primary": palette.textPrimary,
    "color-text-secondary": palette.textSecondary,
    "color-text-tertiary": palette.textTertiary,
    "color-text-disabled": palette.textDisabled,
    "color-border": palette.border,
    "color-success": palette.success,
    "color-warning": palette.warning,
    "color-danger": palette.danger,
    "color-info": palette.info
  },
  dark: {
    "color-bg": palette.bgDark,
    "color-surface": palette.surfaceDark,
    "color-surface-alt": palette.surfaceAltDark,
    "color-primary": palette.primaryDark,
    "color-secondary": palette.secondaryDark,
    "color-text-primary": palette.textPrimaryDark,
    "color-text-secondary": palette.textSecondaryDark,
    "color-border": palette.borderDark,
    "color-success": palette.successDark,
    "color-warning": palette.warningDark,
    "color-danger": palette.dangerDark,
    "color-info": palette.infoDark
  }
};

// ../core/src/prompts/system-prompt.ts
var SYSTEM_PROMPT = `# 角色

你是 Socrates，一名面向大学校园的气候对话助手，风格是温和、平等、非说教的同伴式引导。你的目标不是替用户做决定，而是用动机式访谈（Motivational Interviewing, MI）帮助用户理解日常饮食与包装选择的碳足迹，看见自己可行的小改变，并在自愿前提下记录承诺。你不做道德评判，不用恐吓，不把任何群体贴上高排放标签。

# 对话方法：动机式访谈 OARS
O = Open questions 开放式问题；A = Affirmations 肯定；R = Reflective listening 反映式倾听；S = Summaries 小结。
1. Open questions：以「是什么 / 怎么样 / 你怎么看 / 方便说说吗」展开，避免能用「是/否」回答的引导性提问；不连续盘问，每轮一个主问题。
2. Affirmations：认可用户已有的意识、行动与努力，例如「你已经在留意包装了，这是很好的起点」；肯定基于用户说过的话，不虚构事实。
3. Reflective listening：先复述/映照用户表达的感受与含义，再进入下一句；用「听起来你在意……」「也就是说……」等句式，避免机械重复。
4. Summaries：每个阶段结束前做简短小结，把用户观点、可选方案与待确认事项串起来，经用户确认再进入下一步。

# 分轮策略（与对话状态机一致）
- 开场/建立关系：自我介绍，说明对话用途、数字口径与隐私边界，询问用户当下场景（食堂、便利店、宿舍等）。
- 探索：了解用户最近的一次相关选择、偏好、顾虑与日常约束；只倾听与反映，不急着给数据。
- 信息呈现：在用户愿意了解时，调用工具取得产品属性、品类映射与足迹结果；用中性语言呈现区间与不确定性，不使用「应该/必须/罪恶感」类词汇。
- 权衡：并列备选方案，按内部 5R 排序（Refuse 拒绝、Reduce 减量、Reuse 复用、Recycle 回收、Rot 堆肥）梳理可行行动；5R 是内部标签，不对用户暴露框架名词，前端展示为中文动作词；区间重叠时明确说「两者差异在当前数据下不能确定」。
- 承诺：邀请用户说出愿意尝试的一项小行动；复述承诺、确认意愿与跟进周期后再登记；用户犹豫时不施压，保留「再想想」选项。
- 收尾：小结本轮结论与承诺，提示数据口径局限，礼貌结束。

# 输出格式
1. 普通回复：口语化中文短句；单轮不超过 180 字，避免长段落与列表堆砌。
2. 引用格式：凡涉及具体数字、因子或对比结论，必须随附来源标注，格式为：
   「数据：<来源名称>（<因子/数据集版本>，来源链接），质量等级 <A–E>」；链接来自工具返回的 source_url，禁止编造域名。
3. 数据卡字段：当工具返回数据卡时，向用户呈现：功能单位、总量区间（含单位 kgCO2e）、阶段拆分、数据质量等级、来源与许可证、口径局限说明；区间用「约 X–Y kgCO2e」表述，不报告伪精确点值以外的小数堆砌。
4. 对比表述：先说明功能单位相同再比较；可说「在当前数据与功能单位下，X 的区间整体低于 Y」；区间重叠时只说「差异不显著/不能确定」。
5. 行动口号：在承诺确认后可自然使用 SNOOP 作为鼓励语一次；不把口号强加为任务。

# 守卫规则（硬性，优先级高于对话流畅度）
1. 数字来源强制：对话中出现的一切排放数值、区间、单位、对比结论，只能来自工具返回结果；禁止自行估算、换算出新数字，禁止凭记忆填写排放因子或产品碳足迹。
2. 禁止自编因子：不知道因子时如实说「当前没有可靠因子可比较」，并建议提供更多产品信息，而不是给一个估计数。
3. 引用强制：每个对外展示的数字都要有工具返回的来源；缺来源的数字不得出现在回复中。
4. 低置信度显式声明：匹配置信度 < 0.6、DQ 等级 C 及以下、地理/时间代表性不足时，必须用「这是粗略参考」「因子来自其他地区，仅供方向参考」等措辞显式提示。
5. 不做因果承诺：不宣称产品一定更健康/更便宜/减排多少吨；不提供医学、营养诊断；校园场景外的政策评价保持中性。
6. 敏感与越界话题：个人隐私、健康焦虑、体重、宗教、民族、政治、商业广告等话题不展开；礼貌转回校园消费场景；涉及自伤/伤害风险时给予通用求助渠道提示并结束该话题。
7. 数据边界：说明结果为教育用途的归因型 LCA 估算，不作为采购、认证或学术结论依据；试点研究数据需另行同意才上报。
8. 工具纪律：按当前状态允许的工具调用；参数缺失时先向用户澄清；工具失败时说明已降级到本地信息，不把错误包装成结论。

# 少数示例（few-shot）

用户：「今天中午吃牛肉饭还是素菜饭？」
助手（探索+开放问题）：「听起来你在比较两份套餐。你平时更在意口味、价格，还是这餐对环境的影响？」

（工具已返回：牛肉套餐约 3.62–6.10 kgCO2e，DQ B；素食套餐约 1.28–2.20 kgCO2e，DQ B；来源 Agribalyse 3.2，https://data.ademe.fr/datasets/agribalyse-31-detail-par-ingredient）
助手（信息呈现+引用）：「按同样一份套餐（350 g）来看，牛肉饭大约 3.62–6.10 kgCO2e，素菜饭大约 1.28–2.20 kgCO2e；两组区间没有重叠，当前数据下素菜饭更低。数据来源：Agribalyse 3.2（ADEME，2023 版系列，来源链接如上），质量等级 B；因子偏欧洲场景，本地实际会有出入，仅供方向参考。」

用户：「那我这周先试两次素菜饭算不算承诺？」
助手（反映+确认承诺）：「可以呀，听起来你愿意先从两次素菜饭开始。我复述一下：本周午餐选两次素食套餐，跟进周期 7 天；这是你自愿的选择，想调整随时可以改。确认要记下这个承诺吗？」

# 语气与禁忌
- 允许：温和提问、反映情绪、并列方案、承认不确定、鼓励小行动。
- 禁止：说教命令、罪恶感话术、夸大数字、未经来源的事实断言、替用户决定、连续多个问题、长段科普。
`;

// ../core/src/tools/schemas.ts
var CATEGORY_ID_ENUM = [
  "bottled_water",
  "beverage",
  "meal_beef",
  "meal_veggie",
  "snack",
  "snack_packaging",
  "express_packaging",
  "other"
];
var ATTRIBUTES_SCHEMA = {
  type: "object",
  description: "产品/餐食属性。引擎只读取 geography（ISO 国家/地区码，如 CN、FR，用于因子匹配）；可附 portion_g（克重）、volume_ml（毫升）等说明字段，不要自创 type/size 等键。",
  properties: {
    geography: { type: "string", description: "ISO 国家/地区码，如 CN、FR；缺省按全局/默认因子。" },
    portion_g: { type: "number", description: "可选：餐食克重（说明用，缩放由 quantity/unit 决定）。" },
    volume_ml: { type: "number", description: "可选：饮品/瓶装水容量（毫升，说明用）。" },
    reusable: { type: "boolean", description: "可选：true 表示自带水杯/直饮水等可重复替代，对应直饮水因子。" }
  },
  additionalProperties: true
};
var extractProductAttributesSchema = {
  name: "extract_product_attributes",
  description: "从用户自由文本中抽取产品属性（名称、品牌、配料、规格、包装形态），输出结构化属性与置信度；不做排放估算。",
  parameters: {
    type: "object",
    required: ["free_text"],
    properties: {
      free_text: {
        type: "string",
        minLength: 1,
        maxLength: 1e3,
        description: "用户关于产品的原始描述"
      },
      image_ocr: {
        type: ["string", "null"],
        description: "可选：图片识别得到的文本，演示期通常为 null"
      }
    },
    additionalProperties: false
  },
  result_schema: {
    type: "object",
    required: ["product_name", "category_hint", "ingredients", "package_format", "confidence"],
    properties: {
      product_name: { type: "string" },
      brand: { type: ["string", "null"] },
      category_hint: {
        type: "string",
        enum: [
          "bottled_water",
          "beverage",
          "meal_beef",
          "meal_veggie",
          "snack",
          "snack_packaging",
          "express_packaging",
          "other"
        ]
      },
      ingredients: { type: "array", items: { type: "string" } },
      package_format: {
        type: "string",
        enum: ["bottle", "can", "cup", "tray", "bag", "wrapper", "reusable", "other"]
      },
      quantity_text: { type: ["string", "null"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      missing_fields: { type: "array", items: { type: "string" } }
    },
    additionalProperties: false
  }
};
var mapToCategorySchema = {
  name: "map_to_category",
  description: "把结构化属性映射到 Socrates 内部标准品类；返回主映射与候选备选，以及匹配置信度。",
  parameters: {
    type: "object",
    required: ["attributes"],
    properties: {
      attributes: {
        type: "object",
        required: ["product_name", "category_hint", "ingredients", "package_format"],
        properties: {
          product_name: { type: "string" },
          brand: { type: ["string", "null"] },
          category_hint: { type: "string" },
          ingredients: { type: "array", items: { type: "string" } },
          package_format: { type: "string" },
          quantity_text: { type: ["string", "null"] },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        },
        additionalProperties: false
      }
    },
    additionalProperties: false
  },
  result_schema: {
    type: "object",
    required: ["category_id", "category_path", "mapped", "match_confidence", "alternatives"],
    properties: {
      category_id: { type: "string" },
      category_path: { type: "array", items: { type: "string" } },
      mapped: { type: "boolean" },
      match_confidence: { type: "number", minimum: 0, maximum: 1 },
      alternatives: {
        type: "array",
        items: {
          type: "object",
          required: ["category_id", "reason"],
          properties: {
            category_id: { type: "string" },
            reason: { type: "string" }
          },
          additionalProperties: false
        }
      },
      need_clarification: { type: "boolean" },
      clarification_question: { type: ["string", "null"] }
    },
    additionalProperties: false
  }
};
var getEmissionFactorsSchema = {
  name: "get_emission_factors",
  description: "检索内部因子库中匹配品类与条件的排放因子，返回因子记录、区间、DQ、来源与许可证；不做求和计算。",
  parameters: {
    type: "object",
    required: ["category_id"],
    properties: {
      category_id: { type: "string", enum: CATEGORY_ID_ENUM },
      lifecycle_stage: {
        type: "string",
        enum: ["agriculture", "processing", "transport", "cooking", "packaging", "use", "end_of_life", "all"]
      },
      geography: { type: "string", description: "ISO 国家/地区码，如 CN、FR" },
      season: { type: ["string", "null"] },
      prefer_local: { type: "boolean", default: true }
    },
    additionalProperties: false
  },
  result_schema: {
    type: "object",
    required: ["factors", "selection_note"],
    properties: {
      factors: {
        type: "array",
        items: {
          type: "object",
          required: [
            "factor_id",
            "stage",
            "activity",
            "activity_unit",
            "factor_value",
            "factor_unit",
            "interval_low",
            "interval_high",
            "dq",
            "source_name",
            "source_url",
            "license",
            "version",
            "valid_from",
            "data_type"
          ],
          properties: {
            factor_id: { type: "string" },
            stage: { type: "string" },
            activity: { type: "string" },
            activity_unit: { type: "string" },
            factor_value: { type: "number" },
            factor_unit: { type: "string" },
            interval_low: { type: ["number", "null"] },
            interval_high: { type: ["number", "null"] },
            gwp_version: { type: "string" },
            geography: { type: "string" },
            temporal: { type: "string" },
            dq: {
              type: "object",
              properties: {
                reliability: { type: "integer", minimum: 1, maximum: 5 },
                completeness: { type: "integer", minimum: 1, maximum: 5 },
                temporal: { type: "integer", minimum: 1, maximum: 5 },
                geographic: { type: "integer", minimum: 1, maximum: 5 },
                tech: { type: "integer", minimum: 1, maximum: 5 },
                overall: { type: "string", enum: ["A", "B", "C", "D", "E"] }
              },
              additionalProperties: false
            },
            source_name: { type: "string" },
            source_url: { type: "string" },
            license: { type: "string" },
            attribution: { type: "string" },
            version: { type: "string" },
            valid_from: { type: "string", format: "date" },
            valid_to: { type: ["string", "null"] },
            data_type: { type: "string", enum: ["primary", "secondary"] }
          },
          additionalProperties: false
        }
      },
      selection_note: { type: "string" },
      missing_stages: { type: "array", items: { type: "string" } }
    },
    additionalProperties: false
  }
};
var calculateFootprintSchema = {
  name: "calculate_footprint",
  description: "调用后端确定性 LCA 引擎计算单一产品/餐食的碳足迹；返回功能单位、总量区间、阶段拆分、因子引用与 DQ。引擎不生成新因子。",
  parameters: {
    type: "object",
    required: ["category_id", "attributes", "quantity", "unit"],
    properties: {
      category_id: {
        type: "string",
        enum: CATEGORY_ID_ENUM,
        description: "内部标准品类 id，必须从枚举中选择；牛肉餐=meal_beef，素食餐=meal_veggie，瓶装水=bottled_water，直饮水/自带水杯=other（含直饮水 F-other-001 因子），unit 用 bottle。"
      },
      attributes: ATTRIBUTES_SCHEMA,
      quantity: { type: "number", minimum: 0 },
      unit: { type: "string", enum: ["meal", "bottle", "can", "pack", "item", "g", "ml"] },
      factor_set_id: { type: ["string", "null"] }
    },
    additionalProperties: false
  },
  result_schema: {
    type: "object",
    required: ["functional_unit", "total", "phases", "factors", "data_quality", "disclaimer"],
    properties: {
      functional_unit: { type: "string" },
      total: {
        type: "object",
        required: ["value", "unit", "interval", "confidence"],
        properties: {
          value: { type: "number" },
          unit: { type: "string" },
          interval: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
          confidence: { type: "string", enum: ["high", "medium", "low"] }
        },
        additionalProperties: false
      },
      phases: {
        type: "array",
        items: {
          type: "object",
          required: ["stage", "label", "value", "interval"],
          properties: {
            stage: { type: "string" },
            label: { type: "string" },
            value: { type: "number" },
            interval: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 }
          },
          additionalProperties: false
        }
      },
      factors: { type: "array", items: { type: "object", additionalProperties: true } },
      data_quality: {
        type: "object",
        required: ["overall", "notes"],
        properties: {
          overall: { type: "string", enum: ["A", "B", "C", "D", "E"] },
          notes: { type: "array", items: { type: "string" } }
        },
        additionalProperties: false
      },
      disclaimer: { type: "string" }
    },
    additionalProperties: false
  }
};
var compareAlternativesSchema = {
  name: "compare_alternatives",
  description: "在同一功能单位下对比两件及以上备选，返回各自足迹区间与可比性说明；区间重叠时不宣称绝对优劣。",
  parameters: {
    type: "object",
    required: ["items"],
    properties: {
      items: {
        type: "array",
        minItems: 2,
        items: {
          type: "object",
          required: ["label", "category_id"],
          properties: {
            label: { type: "string" },
            category_id: {
              type: "string",
              enum: CATEGORY_ID_ENUM,
              description: "内部标准品类 id，必须从枚举中选择；直饮水/自带水杯用 other（F-other-001 直饮水因子），不要把自带水杯也写成 bottled_water。"
            },
            attributes: ATTRIBUTES_SCHEMA
          },
          additionalProperties: false
        }
      }
    },
    additionalProperties: false
  },
  result_schema: {
    type: "object",
    required: ["functional_unit", "items", "caveats"],
    properties: {
      functional_unit: { type: "string" },
      items: {
        type: "array",
        items: {
          type: "object",
          required: ["index", "label", "footprint", "dq"],
          properties: {
            index: { type: "integer" },
            label: { type: "string" },
            footprint: {
              type: "object",
              required: ["value", "unit", "interval"],
              properties: {
                value: { type: "number" },
                unit: { type: "string" },
                interval: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 }
              },
              additionalProperties: false
            },
            dq: { type: "string" }
          },
          additionalProperties: false
        }
      },
      overlap: { type: "boolean" },
      caveats: { type: "array", items: { type: "string" } }
    },
    additionalProperties: false
  }
};
var rankBy5rSchema = {
  name: "rank_by_5r",
  description: "将可行的减碳行动按 5R 层级排序，返回每一步是否适用、行动建议与对应选项；不修改足迹数值。",
  parameters: {
    type: "object",
    required: ["alternatives"],
    properties: {
      alternatives: {
        type: "array",
        items: {
          type: "object",
          required: ["label"],
          properties: {
            label: { type: "string" },
            footprint: { type: ["object", "null"] },
            attributes: { type: "object", additionalProperties: true }
          },
          additionalProperties: false
        }
      },
      weights: { type: ["object", "null"], description: "预留：用户偏好权重，首版不启用" }
    },
    additionalProperties: false
  },
  result_schema: {
    type: "object",
    required: ["five_r", "ranking"],
    properties: {
      five_r: {
        type: "array",
        items: {
          type: "object",
          required: ["step", "available", "note"],
          properties: {
            step: { type: "string", enum: ["Refuse", "Reduce", "Reuse", "Recycle", "Rot"] },
            available: { type: "boolean" },
            note: { type: "string" },
            mapped_labels: { type: "array", items: { type: "string" } }
          },
          additionalProperties: false
        }
      },
      ranking: {
        type: "array",
        items: {
          type: "object",
          required: ["index", "level", "score", "note"],
          properties: {
            index: { type: "integer" },
            level: { type: "string" },
            score: { type: "number", minimum: 0, maximum: 1 },
            note: { type: "string" }
          },
          additionalProperties: false
        }
      }
    },
    additionalProperties: false
  }
};
var logCommitmentSchema = {
  name: "log_commitment",
  description: "登记用户自愿作出的减碳承诺与跟进计划；记录自助意愿（self-efficacy）与障碍；不做强制追踪。",
  parameters: {
    type: "object",
    required: ["commitment_text", "category_id", "alternative"],
    properties: {
      commitment_text: { type: "string", minLength: 1, maxLength: 300 },
      category_id: { type: "string", enum: CATEGORY_ID_ENUM },
      alternative: { type: "string" },
      barrier: { type: ["string", "null"] },
      plan: { type: ["string", "null"] },
      self_efficacy: { type: "integer", minimum: 1, maximum: 5 },
      follow_up_days: { type: "integer", minimum: 1, maximum: 90 }
    },
    additionalProperties: false
  },
  result_schema: {
    type: "object",
    required: ["commitment_id", "created_at", "follow_up_due", "status", "consent_recorded"],
    properties: {
      commitment_id: { type: "string" },
      created_at: { type: "string", format: "date-time" },
      follow_up_due: { type: ["string", "null"], format: "date-time" },
      status: { type: "string", enum: ["active", "cancelled"] },
      consent_recorded: { type: "boolean" }
    },
    additionalProperties: false
  }
};
var TOOL_DEFINITIONS = [
  extractProductAttributesSchema,
  mapToCategorySchema,
  getEmissionFactorsSchema,
  calculateFootprintSchema,
  compareAlternativesSchema,
  rankBy5rSchema,
  logCommitmentSchema
];
var DEFINITION_INDEX = new Map(
  TOOL_DEFINITIONS.map((def) => [def.name, def])
);
function getToolDefinition(name) {
  const def = DEFINITION_INDEX.get(name);
  if (!def) throw new Error(`Unknown tool: ${name}`);
  return def;
}

// ../core/src/guards/source-whitelist.ts
var SOURCE_DOMAIN_WHITELIST = /* @__PURE__ */ new Set([
  // CPCD / CAEP (China)
  "lca.cityghg.com",
  "www.caep.org.cn",
  // Agribalyse / ADEME / data.gouv.fr
  "data.ademe.fr",
  "doc.agribalyse.fr",
  "www.data.gouv.fr",
  // Climatiq
  "www.climatiq.io",
  "climatiq.io",
  // Open Food Facts
  "world.openfoodfacts.org",
  "images.openfoodfacts.org",
  // First-version factor sources registered in packages/data (sources.ts)
  "ourworldindata.org",
  // Poore & Nemecek 2018 OWID grapher mirror
  "nems.nih.gov",
  // NEMS PET bottled-water review (www.nems.nih.gov)
  "oregon.gov",
  // Franklin Associates / Oregon DEQ 2009 (www.oregon.gov)
  // Boavizta (reserved, not in first-version main path)
  "doc.api.boavizta.org",
  "github.com",
  // openLCA (factor cross-check reference only)
  "www.openlca.org",
  "openlca.org",
  "nexus.openlca.org"
]);
function domainOf(url) {
  const trimmed = url.trim();
  const withoutScheme = trimmed.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
  const hostPart = withoutScheme.split("/")[0] ?? "";
  const host = hostPart.split(":")[0] ?? "";
  return host.toLowerCase();
}
function isRegisteredSourceUrl(url) {
  const host = domainOf(url);
  if (!host) return false;
  for (const domain of SOURCE_DOMAIN_WHITELIST) {
    if (host === domain || host.endsWith(`.${domain}`)) return true;
  }
  return false;
}
var EMISSION_UNIT_WHITELIST = /* @__PURE__ */ new Set([
  "kgCO2e",
  "gCO2e",
  "kg CO2e",
  "kgCO2e/meal",
  "kgCO2e/bottle",
  "kgCO2e/can",
  "kgCO2e/pack",
  "kgCO2e/item",
  "kgCO2e/g",
  "kgCO2e/ml",
  "kgCO2e/100 g"
]);

// ../core/src/tools/validation.ts
function okResult() {
  return { ok: true, issues: [] };
}
function fail(issues) {
  return { ok: false, issues };
}
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeType(schema) {
  if (schema.type === void 0) return [];
  return Array.isArray(schema.type) ? schema.type : [schema.type];
}
function typeMatches(schema, value) {
  const allowed = normalizeType(schema);
  if (allowed.length === 0) return true;
  if (value === null) return allowed.includes("null");
  switch (allowed[0]) {
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "number":
      return typeof value === "number";
    case "string":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return isPlainObject(value);
    default:
      return true;
  }
}
function validateSchema(schema, value, path, issues) {
  if (schema.type === void 0 && !schema.properties && !schema.items) return;
  if (!typeMatches(schema, value)) {
    issues.push({
      field: path,
      reason: `expected type ${Array.isArray(schema.type) ? schema.type.join("|") : String(schema.type)}`
    });
    return;
  }
  if (value === null) return;
  if (schema.enum && !schema.enum.some((v) => v === value)) {
    issues.push({ field: path, reason: `value ${JSON.stringify(value)} not in enum` });
  }
  if (typeof value === "string") {
    if (schema.minLength !== void 0 && value.length < schema.minLength) {
      issues.push({ field: path, reason: `shorter than minLength ${schema.minLength}` });
    }
    if (schema.maxLength !== void 0 && value.length > schema.maxLength) {
      issues.push({ field: path, reason: `longer than maxLength ${schema.maxLength}` });
    }
  }
  if (typeof value === "number") {
    if (schema.minimum !== void 0 && value < schema.minimum) {
      issues.push({ field: path, reason: `below minimum ${schema.minimum}` });
    }
    if (schema.maximum !== void 0 && value > schema.maximum) {
      issues.push({ field: path, reason: `above maximum ${schema.maximum}` });
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== void 0 && value.length < schema.minItems) {
      issues.push({ field: path, reason: `fewer than minItems ${schema.minItems}` });
    }
    if (schema.maxItems !== void 0 && value.length > schema.maxItems) {
      issues.push({ field: path, reason: `more than maxItems ${schema.maxItems}` });
    }
    if (schema.items) {
      value.forEach(
        (item, index) => validateSchema(schema.items, item, `${path}[${index}]`, issues)
      );
    }
    return;
  }
  if (isPlainObject(value)) {
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in value)) {
          issues.push({ field: `${path}.${key}`, reason: "missing required property" });
        }
      }
    }
    if (schema.properties) {
      for (const [key, sub] of Object.entries(schema.properties)) {
        if (key in value) validateSchema(sub, value[key], `${path}.${key}`, issues);
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(value)) {
        if (!(key in schema.properties)) {
          issues.push({ field: `${path}.${key}`, reason: "additional property not allowed" });
        }
      }
    }
  }
}
function validateToolArgs(tool, args) {
  const def = getToolDefinition(tool);
  const issues = [];
  if (!isPlainObject(args)) {
    return fail([{ field: "args", reason: "arguments must be an object" }]);
  }
  validateSchema(def.parameters, args, "args", issues);
  return issues.length === 0 ? okResult() : fail(issues);
}
function assertInterval(interval, field, issues) {
  if (!Array.isArray(interval) || interval.length !== 2) {
    issues.push({ field, reason: "interval must be a 2-element [low, high] array" });
    return null;
  }
  const [low, high] = interval;
  if (typeof low !== "number" || typeof high !== "number") {
    issues.push({ field, reason: "interval bounds must be numbers" });
    return null;
  }
  if (low > high) {
    issues.push({ field, reason: `interval lower bound ${low} exceeds upper bound ${high}` });
  }
  return [low, high];
}
function checkSourceMetadata(record, field, issues) {
  const sourceUrl = record.source_url;
  if (typeof sourceUrl === "string" && sourceUrl.length > 0) {
    if (!isRegisteredSourceUrl(sourceUrl)) {
      issues.push({ field: `${field}.source_url`, reason: "domain not registered in source whitelist" });
    }
  }
  const license = record.license;
  if (license !== void 0 && (typeof license !== "string" || license.trim().length === 0)) {
    issues.push({ field: `${field}.license`, reason: "license must be a non-empty string" });
  }
  const version = record.version;
  if (version !== void 0 && (typeof version !== "string" || version.trim().length === 0)) {
    issues.push({ field: `${field}.version`, reason: "version must be a non-empty string" });
  }
}
function validateResultCrossChecks(tool, result, issues) {
  switch (tool) {
    case "get_emission_factors": {
      const factors = result.factors;
      if (!Array.isArray(factors)) return;
      factors.forEach((raw, index) => {
        if (!isPlainObject(raw)) return;
        const factor = raw;
        const field = `factors[${index}]`;
        const value = factor.factor_value;
        if (typeof value === "number" && value < 0) {
          issues.push({ field: `${field}.factor_value`, reason: "factor value must be >= 0" });
        }
        const low = factor.interval_low;
        const high = factor.interval_high;
        if (typeof low === "number" && typeof high === "number" && typeof value === "number") {
          if (low > value || value > high) {
            issues.push({ field, reason: "factor value must lie within [interval_low, interval_high]" });
          }
        }
        checkSourceMetadata(factor, field, issues);
      });
      break;
    }
    case "calculate_footprint": {
      const total = result.total;
      if (isPlainObject(total)) {
        if (typeof total.value === "number" && total.value < 0) {
          issues.push({ field: "total.value", reason: "footprint value must be >= 0" });
        }
        if (typeof total.unit === "string" && !EMISSION_UNIT_WHITELIST.has(total.unit)) {
          issues.push({ field: "total.unit", reason: `unit "${total.unit}" not in emission unit whitelist` });
        }
        assertInterval(total.interval, "total.interval", issues);
      }
      const phases = result.phases;
      if (Array.isArray(phases)) {
        phases.forEach((raw, index) => {
          if (!isPlainObject(raw)) return;
          if (typeof raw.value === "number" && raw.value < 0) {
            issues.push({ field: `phases[${index}].value`, reason: "phase value must be >= 0" });
          }
          assertInterval(raw.interval, `phases[${index}].interval`, issues);
        });
      }
      const factors = result.factors;
      if (Array.isArray(factors)) {
        factors.forEach((raw, index) => {
          if (isPlainObject(raw)) checkSourceMetadata(raw, `factors[${index}]`, issues);
        });
      }
      break;
    }
    case "compare_alternatives": {
      const items = result.items;
      if (Array.isArray(items)) {
        items.forEach((raw, index) => {
          if (!isPlainObject(raw)) return;
          const footprint = raw.footprint;
          if (isPlainObject(footprint)) {
            if (typeof footprint.value === "number" && footprint.value < 0) {
              issues.push({ field: `items[${index}].footprint.value`, reason: "value must be >= 0" });
            }
            if (typeof footprint.unit === "string" && !EMISSION_UNIT_WHITELIST.has(footprint.unit)) {
              issues.push({
                field: `items[${index}].footprint.unit`,
                reason: "unit not in emission unit whitelist"
              });
            }
            assertInterval(footprint.interval, `items[${index}].footprint.interval`, issues);
          }
        });
      }
      break;
    }
    default:
      break;
  }
}
function validateToolResult(tool, result) {
  const def = getToolDefinition(tool);
  const issues = [];
  if (!isPlainObject(result)) {
    return fail([{ field: "result", reason: "tool result must be an object" }]);
  }
  validateSchema(def.result_schema, result, "result", issues);
  validateResultCrossChecks(tool, result, issues);
  return issues.length === 0 ? okResult() : fail(issues);
}
function validateToolForState(state, tool) {
  if (isToolAllowed(state, tool)) return okResult();
  return fail([
    {
      field: `state.${state}`,
      reason: `tool "${tool}" is not permitted in MI state "${state}"`
    }
  ]);
}
function validateToolCall(state, tool, args) {
  const stateCheck = validateToolForState(state, tool);
  if (!stateCheck.ok) return stateCheck;
  return validateToolArgs(tool, args);
}

// ../core/src/guards/sensitive.ts
var RULES = [
  {
    category: "politics",
    hard: true,
    keywords: [/政治/, /政党/, /领导人/, /国家政策/, /政策评价/, /政府政策/]
  },
  {
    category: "religion",
    hard: true,
    keywords: [/宗教/, /信仰/, /教会/, /寺庙/]
  },
  {
    category: "ethnicity",
    hard: true,
    keywords: [/民族/, /种族/, /族群/]
  },
  {
    category: "privacy",
    hard: true,
    keywords: [/手机号/, /身份证/, /家庭住址/, /银行卡号/, /密码/]
  },
  {
    category: "self_harm",
    hard: true,
    keywords: [/自杀/, /自残/, /伤害自己/, /不想活/, /轻生/]
  },
  {
    category: "weight_body",
    hard: false,
    keywords: [/体重/, /胖/, /减肥/, /身材/, /长胖/]
  },
  {
    category: "health_anxiety",
    hard: false,
    keywords: [/健康焦虑/, /抑郁/, /焦虑/, /心理疾病/, /自责/]
  },
  {
    category: "advertising",
    hard: false,
    keywords: [/广告/, /带货/, /品牌代言/, /推荐购买/]
  },
  {
    category: "commercial_eval",
    hard: false,
    keywords: [/漂绿/, /洗绿/, /是不是在洗白/, /品牌是不是/]
  },
  {
    category: "nutrition_medical",
    hard: false,
    keywords: [/健康得多/, /营养诊断/, /疗效/, /疾病/, /医学判断/]
  }
];
function classifySensitive(text) {
  const hits = [];
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
function redirectLine(category) {
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

// ../core/src/guards/validate-reply.ts
var NUMBER_PATTERN = /\d+(?:\.\d+)?\s*(?:kgCO2e|gCO2e|kg CO2e)/g;
var URL_PATTERN = /https?:\/\/[^\s，。）)]+/g;
var FACTOR_CLAIM_PATTERNS = [
  /\d+(?:\.\d+)?\s*(?:kg|g|斤|千克|克)\s*[\s\S]{0,12}(?:≈|=|排放|碳足迹|因子)/,
  /排放因子/,
  /每\s*(?:kg|千克|g|克)\s*.{0,20}(?:≈|=|碳|排放)/
];
var HEDGE_PHRASES = [
  "粗略参考",
  "仅供方向参考",
  "其他地区",
  "代表性不足",
  "方向参考",
  "估算",
  "粗略"
];
var DEGRADED_NEUTRAL_TEXT = "数据已挂载到信息卡，我们基于已核对的区间聊聊可以尝试的小改变。";
function collectNumbers(value, sink) {
  if (value === null || value === void 0) return;
  if (typeof value === "number") {
    if (Number.isFinite(value)) sink.add(value);
    return;
  }
  if (typeof value === "string") return;
  if (Array.isArray(value)) {
    for (const item of value) collectNumbers(item, sink);
    return;
  }
  if (typeof value === "object") {
    for (const nested of Object.values(value)) {
      collectNumbers(nested, sink);
    }
  }
}
function collectSourceUrls(value, sink) {
  if (value === null || value === void 0) return;
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value)) sink.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectSourceUrls(item, sink);
    return;
  }
  if (typeof value === "object") {
    const record = value;
    if (typeof record.source_url === "string") sink.add(record.source_url);
    for (const nested of Object.values(record)) collectSourceUrls(nested, sink);
  }
}
function buildAuthorizedFromToolResults(results) {
  const numbers = /* @__PURE__ */ new Set();
  const sourceUrls = /* @__PURE__ */ new Set();
  for (const result of results) {
    collectNumbers(result, numbers);
    collectSourceUrls(result, sourceUrls);
  }
  return { numbers: [...numbers], sourceUrls: [...sourceUrls] };
}
function matchesAuthorized(token, authorized) {
  const numeric = token.match(/(\d+(?:\.\d+)?)/);
  if (!numeric) return false;
  const value = Number(numeric[1]);
  return authorized.numbers.some((allowed) => Math.abs(allowed - value) <= 1e-6);
}
function hasFactorClaim(text) {
  return FACTOR_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}
function hasAttachedSource(text) {
  if (/数据[:：]/.test(text)) return true;
  if (/来源/.test(text)) return true;
  const urls = text.match(URL_PATTERN) ?? [];
  return urls.some((url) => isRegisteredSourceUrl(url));
}
function isWeakConfidence(context) {
  if (!context) return false;
  const weakDq = context.dq === "C" || context.dq === "D" || context.dq === "E";
  return Boolean(
    context.lowConfidence || weakDq || context.geographyWeak || context.temporalWeak
  );
}
function stripUnregisteredUrls(text) {
  const stripped = [];
  const cleaned = text.replace(URL_PATTERN, (url) => {
    if (isRegisteredSourceUrl(url)) return url;
    stripped.push(url);
    return "";
  });
  return { text: cleaned.replace(/\s{2,}/g, " ").trim(), stripped };
}
function validateReply(text, authorized, context) {
  const issues = [];
  const strippedUrls = [];
  let blocked = false;
  const numberTokens = text.match(NUMBER_PATTERN) ?? [];
  for (const token of numberTokens) {
    if (!matchesAuthorized(token, authorized)) {
      issues.push({ tag: "UNAUTHORIZED_NUMBER", detail: `unauthorized emission number: ${token}` });
    }
  }
  const urls = text.match(URL_PATTERN) ?? [];
  for (const url of urls) {
    if (!isRegisteredSourceUrl(url)) {
      issues.push({ tag: "UNREGISTERED_URL", detail: `domain ${domainOf(url)} not registered` });
      strippedUrls.push(url);
    }
  }
  if (hasFactorClaim(text) && !hasAttachedSource(text)) {
    issues.push({
      tag: "MISSING_CITATION",
      detail: "emission factor claim has no attached source citation"
    });
  }
  const weak = isWeakConfidence(context?.lowConfidence);
  if (weak && !HEDGE_PHRASES.some((phrase) => text.includes(phrase))) {
    issues.push({
      tag: "LOW_CONFIDENCE_MISSING_WORDING",
      detail: "weak confidence / DQ result lacks an explicit hedge phrase"
    });
  }
  const sensitive = classifySensitive(text);
  for (const hit of sensitive) {
    issues.push({
      tag: "GUARDED_TOPIC",
      detail: `sensitive topic "${hit.matched}" (${hit.category})`,
      category: hit.category
    });
    if (hit.hard) blocked = true;
  }
  const needsRegeneration = issues.some(
    (issue) => issue.tag === "UNAUTHORIZED_NUMBER" || issue.tag === "MISSING_CITATION"
  );
  return { issues, blocked, needsRegeneration, degraded: false, strippedUrls };
}
function markDegraded(report) {
  return { ...report, degraded: true };
}
function nextGuardAction(attempt, report) {
  if (!report.blocked && !report.needsRegeneration) return "allow";
  if (report.blocked) return "degrade";
  return attempt < 1 ? "regenerate" : "degrade";
}

// ../core/src/adapters/llm/errors.ts
var LlmError = class extends Error {
  kind;
  status;
  cause;
  constructor(kind, message, status, cause) {
    super(message);
    this.name = "LlmError";
    this.kind = kind;
    this.status = status;
    this.cause = cause;
  }
};

// ../core/src/adapters/llm/openai-compatible.ts
var DEFAULT_TIMEOUT_MS = 15e3;
var DEFAULT_MAX_RETRIES = 2;
function normalizeMessages(messages) {
  return messages.map((msg) => {
    const base = { role: msg.role, content: msg.content };
    if (msg.name !== void 0) base.name = msg.name;
    if (msg.tool_call_id !== void 0) base.tool_call_id = msg.tool_call_id;
    if (msg.tool_calls) {
      base.tool_calls = msg.tool_calls.map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: JSON.stringify(call.arguments) }
      }));
    }
    return base;
  });
}
function toOpenAiTools(tools) {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}
var OpenAICompatibleLlm = class {
  provider;
  config;
  fetchImpl;
  constructor(config) {
    this.assertConfigured(config);
    this.provider = config.provider;
    this.config = config;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }
  assertConfigured(config) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new LlmError(
        "missing_credentials",
        `LLM provider "${config.provider}" has no API key; set LLM_API_KEY or inject a key.`
      );
    }
    if (!config.baseUrl || config.baseUrl.trim().length === 0) {
      throw new LlmError(
        "missing_credentials",
        `LLM provider "${config.provider}" has no base URL; set LLM_BASE_URL.`
      );
    }
    if (!config.model || config.model.trim().length === 0) {
      throw new LlmError(
        "missing_credentials",
        `LLM provider "${config.provider}" has no model; set LLM_MODEL.`
      );
    }
  }
  async complete(options) {
    this.assertConfigured({ ...this.config, provider: this.provider });
    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = this.config.maxRetries ?? DEFAULT_MAX_RETRIES;
    const endpoint = `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const body = {
      model: this.config.model,
      messages: normalizeMessages(options.messages),
      temperature: options.temperature ?? this.config.temperature,
      max_tokens: options.maxTokens ?? this.config.maxTokens,
      stream: false
    };
    if (options.tools && options.tools.length > 0) {
      body.tools = toOpenAiTools(options.tools);
      body.tool_choice = options.toolChoice ?? "auto";
    }
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const onOuterAbort = () => controller.abort(options.signal?.reason);
      options.signal?.addEventListener("abort", onOuterAbort);
      try {
        const response = await this.fetchImpl(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        if (!response.ok) {
          const status = response.status;
          if (status === 401 || status === 403) {
            throw new LlmError("auth", `LLM rejected credentials (HTTP ${status})`, status);
          }
          if (status === 429) {
            throw new LlmError("rate_limit", `LLM rate limited (HTTP ${status})`, status);
          }
          if (status >= 500 && attempt < maxRetries) {
            lastError = new LlmError("upstream", `LLM upstream error (HTTP ${status})`, status);
            await sleep(300 * 2 ** attempt, options.signal);
            continue;
          }
          throw new LlmError(
            status >= 500 ? "unavailable" : "upstream",
            `LLM request failed (HTTP ${status})`,
            status
          );
        }
        const payload = await response.json();
        const choice = payload.choices?.[0];
        if (!choice?.message) {
          throw new LlmError("invalid_response", "LLM response has no choices[0].message");
        }
        const content = choice.message.content ?? "";
        const toolCalls = this.parseToolCalls(choice.message.tool_calls);
        options.onToken?.(content);
        return {
          content,
          toolCalls,
          finishReason: toolCalls.length > 0 ? "tool_calls" : choice.finish_reason === "length" ? "length" : "stop",
          usage: payload.usage ? {
            promptTokens: payload.usage.prompt_tokens,
            completionTokens: payload.usage.completion_tokens,
            totalTokens: payload.usage.total_tokens
          } : void 0,
          raw: payload
        };
      } catch (error) {
        if (error instanceof LlmError) throw error;
        if (error instanceof DOMException && error.name === "AbortError") {
          if (options.signal?.aborted) {
            throw new LlmError("unavailable", "LLM request aborted", void 0, error);
          }
          lastError = new LlmError(
            "timeout",
            `LLM request timed out after ${timeoutMs}ms`,
            void 0,
            error
          );
          if (attempt < maxRetries) {
            await sleep(300 * 2 ** attempt, options.signal).catch(() => void 0);
            continue;
          }
          throw lastError;
        }
        lastError = error;
        if (attempt < maxRetries) {
          await sleep(300 * 2 ** attempt, options.signal).catch(() => void 0);
          continue;
        }
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", onOuterAbort);
      }
    }
    throw lastError instanceof LlmError ? lastError : new LlmError("upstream", "LLM request failed after retries", void 0, lastError);
  }
  parseToolCalls(raw) {
    if (!raw) return [];
    return raw.map((call, index) => {
      let parsed = {};
      try {
        parsed = JSON.parse(call.function.arguments);
      } catch (error) {
        throw new LlmError(
          "invalid_response",
          `Tool call ${index} has non-JSON arguments`,
          void 0,
          error
        );
      }
      return { id: call.id, name: call.function.name, arguments: parsed };
    });
  }
};

// ../core/src/adapters/llm/mock.ts
function splitForStreaming(text) {
  if (text.length === 0) return [];
  const sentences = text.match(/[^。！？!?；;]+[。！？!?；;]?/g) ?? [text];
  const chunks = [];
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
function latestUserMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg?.role === "user") return msg.content;
  }
  return "";
}
var MockLlm = class {
  provider = "mock";
  queue;
  constructor(replies = []) {
    this.queue = [...replies];
  }
  enqueue(reply) {
    this.queue.push(reply);
  }
  async complete(options) {
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
      finishReason: toolCalls.length > 0 ? "tool_calls" : reply?.finishReason ?? "stop",
      usage: { promptTokens: 0, completionTokens: content.length, totalTokens: content.length },
      raw: { mock: true, reply }
    };
  }
};

// ../core/src/adapters/llm/factory.ts
function parsePositiveInt(raw) {
  if (raw === void 0) return void 0;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : void 0;
}
var PROVIDER_DEFAULTS = {
  deepseek: "https://api.deepseek.com",
  openai: "https://api.openai.com/v1",
  ark: "https://ark.cn-beijing.volces.com/api/v3",
  volcano: "https://ark.cn-beijing.volces.com/api/v3",
  volcanoark: "https://ark.cn-beijing.volces.com/api/v3"
};
function createLlmAdapter(config = {}, env = process.env) {
  const provider = (config.provider ?? env.LLM_PROVIDER ?? "mock").trim().toLowerCase();
  if (provider === "mock" || provider === "") {
    return new MockLlm();
  }
  const baseUrl = config.baseUrl ?? env.LLM_BASE_URL ?? PROVIDER_DEFAULTS[provider] ?? "";
  const apiKey = config.apiKey ?? env.LLM_API_KEY ?? "";
  const model = config.model ?? env.LLM_MODEL ?? "";
  return new OpenAICompatibleLlm({
    provider,
    baseUrl,
    apiKey,
    model,
    timeoutMs: config.timeoutMs ?? parsePositiveInt(env.LLM_TIMEOUT_MS),
    maxRetries: config.maxRetries ?? parsePositiveInt(env.LLM_MAX_RETRIES)
  });
}

// ../core/src/adapters/llm/provider-profile.ts
function loadActiveProfile(env = process.env) {
  const baseUrl = (env.LLM_BASE_URL ?? "").trim();
  const apiKey = (env.LLM_API_KEY ?? "").trim();
  if (!baseUrl || !apiKey) return null;
  const id = (env.LLM_PROVIDER ?? "openai-compatible").trim() || "openai-compatible";
  const defaultModel = (env.LLM_MODEL ?? "").trim();
  return { id, baseUrl, apiKey, defaultModel };
}
function createAdapterForProfile(profile, modelOverride) {
  const model = (modelOverride ?? profile.defaultModel).trim();
  if (!model) {
    throw new LlmError(
      "invalid_response",
      "No model selected: the profile has no default model and no override was supplied."
    );
  }
  return new OpenAICompatibleLlm({
    provider: profile.id,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    model
  });
}

// ../core/src/mi/orchestrator/transition.ts
var PRODUCT_KEYWORD_RE = /餐|饭|肉|菜|水|瓶|罐|零食|可乐|饮料|包装|袋|盒|杯|果汁|奶|小吃/;
function detectProductMention(text, context) {
  if (context?.productHint) return true;
  return PRODUCT_KEYWORD_RE.test(text);
}
function decideNextState(state, signals, userText, context) {
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
      const lowConfidence = signals.confidence !== void 0 && signals.confidence < 0.6;
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

// ../core/src/mi/orchestrator/orchestrator.ts
var COMPARE_INTENT_RE = /哪个|对比|比较|vs|VS|区别|替代|还是|差多少|自带|换/;
var FORWARD_CHAIN = {
  WELCOME: "RAPPORT",
  RAPPORT: "DISCOVERY",
  DISCOVERY: "FACT_SHARING",
  FACT_SHARING: "DECISION",
  DECISION: "COMMITMENT",
  COMMITMENT: "CLOSING",
  CLOSING: void 0,
  GUARDED: void 0,
  FALLBACK: void 0
};
var FALLBACK_NETWORK_LINE = "网络不太稳定，已切换到离线示例模式。";
var DEFAULT_MAX_TOOL_CALLS = 6;
function sessionIdSeed() {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function mapLlmErrorToCode(error) {
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
var MiOrchestrator = class {
  sessionId;
  locale;
  mode;
  state;
  turn = 0;
  messages;
  lastGuardReport = null;
  llm;
  executor;
  maxToolCalls;
  authorizedResults = [];
  signals = {};
  guardContext = {};
  constructor(config) {
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
  preAdvance(text, context) {
    if (!detectProductMention(text, context)) return this.state;
    const target = COMPARE_INTENT_RE.test(text) ? "DECISION" : "DISCOVERY";
    let current = this.state;
    while (current !== target) {
      const next = FORWARD_CHAIN[current];
      if (!next || !canTransition(current, next)) break;
      current = next;
    }
    return current;
  }
  stateEvent(nextState, turn) {
    return {
      event: "state",
      data: { session_id: this.sessionId, mi_state: nextState, turn }
    };
  }
  allowedToolSpecs() {
    return Object.values(
      Object.fromEntries(
        Object.keys(TOOL_NAME_SET).filter((name) => isToolAllowed(this.state, name)).map((name) => {
          const def = getToolDefinition(name);
          return [
            name,
            { name: def.name, description: def.description, parameters: def.parameters }
          ];
        })
      )
    );
  }
  async handleUserMessage(message, context) {
    const events = [];
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
      events.push(...await this.runTurn(message, context));
    } catch (error) {
      const code = error instanceof LlmError ? mapLlmErrorToCode(error) : "UPSTREAM_ERROR";
      const messageText = error instanceof Error ? error.message : "internal error";
      events.push({ event: "error", data: { code, message: messageText } });
      this.state = "FALLBACK";
      events.push(this.stateEvent("FALLBACK", this.turn));
      events.push({ event: "token", data: { delta: FALLBACK_NETWORK_LINE } });
      events.push({ event: "done", data: { finish_reason: "error", turn: this.turn } });
    }
    return events;
  }
  async runTurn(userText, context) {
    const events = [];
    const tools = this.allowedToolSpecs();
    const forceTool = tools.length > 0 && (this.state === "FACT_SHARING" || this.state === "DECISION");
    const first = await this.llm.complete({
      messages: this.messages,
      tools,
      toolChoice: forceTool ? "required" : "auto",
      onToken: (delta) => events.push({ event: "token", data: { delta } })
    });
    if (first.toolCalls.length > 0) {
      await this.executeToolCalls(first.toolCalls, events);
      const followUp = await this.llm.complete({
        messages: this.messages,
        tools,
        onToken: (delta) => events.push({ event: "token", data: { delta } })
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
  async executeToolCalls(toolCalls, events) {
    for (const rawCall of toolCalls.slice(0, this.maxToolCalls)) {
      const call = {
        id: rawCall.id,
        name: rawCall.name,
        arguments: rawCall.arguments
      };
      events.push({ event: "tool_call", data: { tool: call.name, args: call.arguments } });
      const gate = validateToolCall(this.state, call.name, call.arguments);
      if (!gate.ok) {
        events.push({
          event: "tool_result",
          data: { tool: call.name, ok: false, error: "INVALID_PAYLOAD" }
        });
        continue;
      }
      if (!this.executor) {
        events.push({
          event: "tool_result",
          data: { tool: call.name, ok: false, error: "UPSTREAM_ERROR" }
        });
        continue;
      }
      const outcome = await this.executor(call.name, call.arguments);
      if (!outcome.ok) {
        events.push({
          event: "tool_result",
          data: { tool: call.name, ok: false, error: outcome.error ?? "UPSTREAM_ERROR" }
        });
        continue;
      }
      const resultCheck = validateToolResult(call.name, outcome.result);
      if (!resultCheck.ok) {
        events.push({
          event: "tool_result",
          data: { tool: call.name, ok: false, error: "INVALID_PAYLOAD" }
        });
        continue;
      }
      this.authorizedResults.push(outcome.result);
      events.push({
        event: "tool_result",
        data: { tool: call.name, ok: true, result: outcome.result }
      });
      this.attachResultEvents(call.name, outcome.result, events);
      if (outcome.signals) this.signals = { ...this.signals, ...outcome.signals };
    }
  }
  attachResultEvents(tool, result, events) {
    if (tool === "calculate_footprint") {
      events.push({ event: "datacard", data: result });
      return;
    }
    if (tool === "compare_alternatives") {
      events.push({ event: "compare", data: result });
      return;
    }
    if (tool === "log_commitment" && typeof result === "object" && result !== null) {
      const record = result;
      events.push({
        event: "commitment",
        data: { commitment_id: record.commitment_id ?? "cmt_unknown", suggested: true }
      });
    }
  }
  async guardAndReply(replyText, events) {
    const authorized = buildAuthorizedFromToolResults(this.authorizedResults);
    let report = validateReply(replyText, authorized, this.guardContext);
    let action = nextGuardAction(0, report);
    if (action === "regenerate") {
      const retry = await this.llm.complete({
        messages: this.messages,
        tools: this.allowedToolSpecs(),
        onToken: (delta) => events.push({ event: "token", data: { delta } })
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
  setGuardContext(context) {
    this.guardContext = context;
  }
  getAuthorizedResults() {
    return [...this.authorizedResults];
  }
};
var TOOL_NAME_SET = {
  extract_product_attributes: true,
  map_to_category: true,
  get_emission_factors: true,
  calculate_footprint: true,
  compare_alternatives: true,
  rank_by_5r: true,
  log_commitment: true
};

// build/shared/http.ts
var ERROR_STATUS = {
  INVALID_PAYLOAD: 400,
  SESSION_REQUIRED: 401,
  TOPIC_BLOCKED: 403,
  PRODUCT_NOT_FOUND: 404,
  FACTOR_NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  LLM_UNAVAILABLE: 503,
  SPEECH_UNAVAILABLE: 503,
  LCA_ENGINE_ERROR: 503,
  UPSTREAM_TIMEOUT: 504,
  INTERNAL: 500
};
function statusForCode(code) {
  return ERROR_STATUS[code] ?? 500;
}
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id, x-llm-model",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};
function preflightResponse() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8", ...extraHeaders }
  });
}
function errorResponse(code, message, details = [], retryAfter = null) {
  const status = statusForCode(code);
  const body = { error: { code, message, details, retry_after: retryAfter } };
  return jsonResponse(body, status);
}
function envObject() {
  if (typeof Deno !== "undefined" && Deno.env && typeof Deno.env.toObject === "function") {
    return Deno.env.toObject();
  }
  return {};
}
async function readJsonBody(request) {
  const raw = await request.text();
  if (raw.trim().length === 0) {
    return { ok: false, value: null, issues: [{ field: "body", reason: "request body is empty" }] };
  }
  try {
    const value = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {
        ok: false,
        value,
        issues: [{ field: "body", reason: "request body must be a JSON object" }]
      };
    }
    return { ok: true, value, issues: [] };
  } catch {
    return { ok: false, value: null, issues: [{ field: "body", reason: "invalid JSON" }] };
  }
}

// ../data/src/types.ts
var LIFECYCLE_STAGES = [
  "agriculture",
  "processing",
  "transport",
  "cooking",
  "packaging",
  "use",
  "end_of_life"
];

// ../data/src/factors/sources.ts
var SOURCE_POORE_NEMECEK_2018 = {
  source_name: "Poore & Nemecek (2018), Science 360:987–992; OWID grapher mirror",
  source_url: "https://ourworldindata.org/grapher/ghg-per-kg-poore.csv",
  source_publisher: "Joseph Poore, Thomas Nemecek; Our World in Data mirror",
  license: "CC BY 4.0 (OWID representation); original study terms per Science",
  attribution: "Poore, J. & Nemecek, T. (2018) Reducing food's environmental impacts through producers and consumers. Science 360:987–992.",
  version: "2018 (data baseline ~2010)"
};
var SOURCE_PET_BOTTLE_REVIEW = {
  source_name: "Life Cycle Environmental Impact of PET Water Bottles (NEMS-hosted review)",
  source_url: "https://www.nems.nih.gov/Documents/PETWaterBottlesEnvironmentalImpact.pdf",
  source_publisher: "NEMS; compiles Franklin Associates 2011, Gleick & Cooley 2009, Gironi & Piemonte 2010, Papong et al. 2014",
  license: "待核实（机构公开网页综述；引用文献各自许可未逐一确认）",
  attribution: "PET Water Bottles Environmental Impact review, NEMS; underlying LCI: Franklin Associates (2011/2009), Gleick & Cooley (2009), Gironi & Piemonte (2010).",
  version: "review accessed 2026-11-15"
};
var SOURCE_FRANKLIN_2009 = {
  source_name: "Life Cycle Assessment of Drinking Water Systems: Bottled, Tap and HOD Water (09-LQ-104)",
  source_url: "https://www.oregon.gov/deq/FilterDocs/wprLCycleAssessDW.pdf",
  source_publisher: "Franklin Associates (ERG) for Oregon Department of Environmental Quality",
  license: "待核实（美国州政府公开报告；使用条款未逐一确认）",
  attribution: "Franklin Associates, A Division of ERG, prepared for Oregon DEQ, revised final peer-reviewed LCA report, 2009-10-22.",
  version: "2009-10-22 (09-LQ-104)"
};

// ../data/src/factors/factors.ts
function dq(reliability, completeness, temporal, geographic, tech, overall) {
  return { reliability, completeness, temporal, geographic, tech, overall };
}
var AGRIBALYSE_CROSS_REF = "Agribalyse 3.2 (ADEME, Etalab Open Licence 2.0) is documented as the open European cross-reference: https://data.ademe.fr/datasets/agribalyse-31-synthese";
var FACTORS = [
  // ---------------------------------------------------------------- bottled water
  {
    factor_id: "F-bottled-water-001",
    category_id: "bottled_water",
    lifecycle_stage: "packaging",
    activity: "500 ml PET 瓶体与瓶盖 — 树脂生产",
    activity_unit: "bottle",
    emission_factor_value: 0.0502,
    emission_factor_unit: "kgCO2e / bottle",
    interval_low: 0.0379,
    interval_high: 0.0625,
    gwp_version: "GWP100 (source LCI, version unspecified)",
    geography: "US",
    temporal_validity: "2009–2014 source studies",
    source_name: SOURCE_PET_BOTTLE_REVIEW.source_name,
    source_url: SOURCE_PET_BOTTLE_REVIEW.source_url,
    source_publisher: SOURCE_PET_BOTTLE_REVIEW.source_publisher,
    license: SOURCE_PET_BOTTLE_REVIEW.license,
    attribution: SOURCE_PET_BOTTLE_REVIEW.attribution,
    version: SOURCE_PET_BOTTLE_REVIEW.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(3, 2, 3, 2, 3, "C"),
    data_type: "secondary",
    remarks: "树脂生产 2.19–2.733 kgCO2e/kg PET，按 13.3–26 g 瓶重换算为 0.0379–0.0625/500 ml 瓶；美国场景，中国本地电网与瓶重未纳入。"
  },
  {
    factor_id: "F-bottled-water-002",
    category_id: "bottled_water",
    lifecycle_stage: "processing",
    activity: "500 ml PET 瓶吹塑成型",
    activity_unit: "bottle",
    emission_factor_value: 0.04,
    emission_factor_unit: "kgCO2e / bottle",
    interval_low: 0.034,
    interval_high: 0.046,
    gwp_version: "GWP100 (source LCI, version unspecified)",
    geography: "US",
    temporal_validity: "2009–2014 source studies",
    source_name: SOURCE_PET_BOTTLE_REVIEW.source_name,
    source_url: SOURCE_PET_BOTTLE_REVIEW.source_url,
    source_publisher: SOURCE_PET_BOTTLE_REVIEW.source_publisher,
    license: SOURCE_PET_BOTTLE_REVIEW.license,
    attribution: SOURCE_PET_BOTTLE_REVIEW.attribution,
    version: SOURCE_PET_BOTTLE_REVIEW.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(3, 2, 3, 2, 3, "C"),
    data_type: "secondary",
    remarks: "瓶坯注塑与吹塑 0.034–0.046 kgCO2e/500 ml 瓶；运输阶段来源未量化，本库未单列。"
  },
  {
    factor_id: "F-bottled-water-003",
    category_id: "bottled_water",
    lifecycle_stage: "use",
    activity: "500 ml 瓶装水 — 水处理灌装与冷藏",
    activity_unit: "bottle",
    emission_factor_value: 63e-4,
    emission_factor_unit: "kgCO2e / bottle",
    interval_low: 2e-4,
    interval_high: 0.0124,
    gwp_version: "GWP100 (source LCI, version unspecified)",
    geography: "US",
    temporal_validity: "2009–2014 source studies",
    source_name: SOURCE_PET_BOTTLE_REVIEW.source_name,
    source_url: SOURCE_PET_BOTTLE_REVIEW.source_url,
    source_publisher: SOURCE_PET_BOTTLE_REVIEW.source_publisher,
    license: SOURCE_PET_BOTTLE_REVIEW.license,
    attribution: SOURCE_PET_BOTTLE_REVIEW.attribution,
    version: SOURCE_PET_BOTTLE_REVIEW.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(3, 2, 3, 2, 3, "C"),
    data_type: "secondary",
    remarks: "水处理灌装 0.0002 kgCO2e/瓶；冷藏 0.0248 kgCO2e/L × 0.5 L = 0.0124/瓶；区间为两端包络，点值取中值。"
  },
  {
    factor_id: "F-bottled-water-004",
    category_id: "bottled_water",
    lifecycle_stage: "end_of_life",
    activity: "500 ml PET 瓶末端处置（混合回收/填埋/焚烧）",
    activity_unit: "bottle",
    emission_factor_value: 0.01,
    emission_factor_unit: "kgCO2e / bottle",
    interval_low: null,
    interval_high: null,
    gwp_version: "GWP100 (source LCI, version unspecified)",
    geography: "US",
    temporal_validity: "2009–2014 source studies",
    source_name: SOURCE_PET_BOTTLE_REVIEW.source_name,
    source_url: SOURCE_PET_BOTTLE_REVIEW.source_url,
    source_publisher: SOURCE_PET_BOTTLE_REVIEW.source_publisher,
    license: SOURCE_PET_BOTTLE_REVIEW.license,
    attribution: SOURCE_PET_BOTTLE_REVIEW.attribution,
    version: SOURCE_PET_BOTTLE_REVIEW.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "来源仅给出焚烧 0.0211、回收抵扣 −0.0114 kgCO2e/瓶；填埋负荷未量化。0.010 为混合处置工程假设，区间由 DQ 等级生成，待 CPCD/ecoinvent 本地因子替换。"
  },
  // ------------------------------------------------------------------ beverage
  {
    factor_id: "F-beverage-001",
    category_id: "beverage",
    lifecycle_stage: "packaging",
    activity: "500 ml PET 瓶装饮料瓶体（树脂生产）",
    activity_unit: "bottle",
    emission_factor_value: 0.0502,
    emission_factor_unit: "kgCO2e / bottle",
    interval_low: 0.0379,
    interval_high: 0.0625,
    gwp_version: "GWP100 (source LCI, version unspecified)",
    geography: "US",
    temporal_validity: "2009–2014 source studies",
    source_name: SOURCE_PET_BOTTLE_REVIEW.source_name,
    source_url: SOURCE_PET_BOTTLE_REVIEW.source_url,
    source_publisher: SOURCE_PET_BOTTLE_REVIEW.source_publisher,
    license: SOURCE_PET_BOTTLE_REVIEW.license,
    attribution: SOURCE_PET_BOTTLE_REVIEW.attribution,
    version: SOURCE_PET_BOTTLE_REVIEW.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(3, 2, 3, 2, 3, "C"),
    data_type: "secondary",
    remarks: "通用 PET 瓶体因子，未区分碳酸/茶饮/果汁；饮料内容物足迹未覆盖。铝罐/利乐包因子待补。"
  },
  // ------------------------------------------------------------- meal: beef
  {
    factor_id: "F-meal-beef-001",
    category_id: "meal_beef",
    lifecycle_stage: "agriculture",
    activity: "350 g 牛肉套餐：牛肉 100 g + 米饭 150 g + 蔬菜 100 g（种植/养殖）",
    activity_unit: "meal",
    emission_factor_value: 10.6685,
    emission_factor_unit: "kgCO2e / meal",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR5-GWP100 (study baseline)",
    geography: "GLOBAL",
    temporal_validity: "2010 baseline / 2018 publication",
    source_name: SOURCE_POORE_NEMECEK_2018.source_name,
    source_url: SOURCE_POORE_NEMECEK_2018.source_url,
    source_publisher: SOURCE_POORE_NEMECEK_2018.source_publisher,
    license: SOURCE_POORE_NEMECEK_2018.license,
    attribution: SOURCE_POORE_NEMECEK_2018.attribution,
    version: SOURCE_POORE_NEMECEK_2018.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(3, 3, 3, 2, 3, "C"),
    data_type: "secondary",
    remarks: "按 P&N 全球平均 per-kg 产品值加权：牛肉 0.100×99.48 + 大米 0.150×4.45 + 蔬菜 0.100×0.53 = 10.6685 kgCO2e/份。P&N 数值为全链路平均，本库置于养殖/种植阶段；加工与运输不单列以避免重复计算。全球平均，中国本地养殖/电网差异未纳入。" + AGRIBALYSE_CROSS_REF + "。"
  },
  {
    factor_id: "F-meal-beef-002",
    category_id: "meal_beef",
    lifecycle_stage: "cooking",
    activity: "食堂烹饪能耗（单份套餐）",
    activity_unit: "meal",
    emission_factor_value: 0.15,
    emission_factor_unit: "kgCO2e / meal",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR6-GWP100",
    geography: "CN",
    temporal_validity: "2025",
    source_name: "工程分摊假设（无公开 LCI 直接对应）",
    source_url: "",
    source_publisher: "Socrates 本地工程估算",
    license: "待核实",
    attribution: "内部假设，不对外引用为外部数据。",
    version: "0.1-draft",
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "食堂燃气/电力烹饪分摊假设值；未按本地电网因子折算，区间由 DQ 等级生成，待 CPCD 电力因子或实测替换。"
  },
  {
    factor_id: "F-meal-beef-003",
    category_id: "meal_beef",
    lifecycle_stage: "packaging",
    activity: "食堂可重复餐具/一次性餐具分摊（单份）",
    activity_unit: "meal",
    emission_factor_value: 0.05,
    emission_factor_unit: "kgCO2e / meal",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR6-GWP100",
    geography: "CN",
    temporal_validity: "2025",
    source_name: "工程分摊假设（无公开 LCI 直接对应）",
    source_url: "",
    source_publisher: "Socrates 本地工程估算",
    license: "待核实",
    attribution: "内部假设，不对外引用为外部数据。",
    version: "0.1-draft",
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "可重复餐具按使用次数线性分摊（报告 §8.4）；一次性餐具全额计入的场景未覆盖，包材因子待 CPCD/ecoinvent 核实。"
  },
  // ----------------------------------------------------------- meal: veggie
  {
    factor_id: "F-meal-veggie-001",
    category_id: "meal_veggie",
    lifecycle_stage: "agriculture",
    activity: "350 g 素食套餐：米饭 150 g + 蔬菜 120 g + 豆腐 80 g（种植/加工原料）",
    activity_unit: "meal",
    emission_factor_value: 0.9839,
    emission_factor_unit: "kgCO2e / meal",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR5-GWP100 (study baseline)",
    geography: "GLOBAL",
    temporal_validity: "2010 baseline / 2018 publication",
    source_name: SOURCE_POORE_NEMECEK_2018.source_name,
    source_url: SOURCE_POORE_NEMECEK_2018.source_url,
    source_publisher: SOURCE_POORE_NEMECEK_2018.source_publisher,
    license: SOURCE_POORE_NEMECEK_2018.license,
    attribution: SOURCE_POORE_NEMECEK_2018.attribution,
    version: SOURCE_POORE_NEMECEK_2018.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(3, 3, 3, 2, 3, "C"),
    data_type: "secondary",
    remarks: "P&N 加权：大米 0.150×4.45 + 蔬菜 0.120×0.53 + 豆腐 0.080×3.16 = 0.9839 kgCO2e/份；与牛肉餐同 350 g 功能单位、同边界。菜品配方随食堂变化较大。" + AGRIBALYSE_CROSS_REF + "。"
  },
  {
    factor_id: "F-meal-veggie-002",
    category_id: "meal_veggie",
    lifecycle_stage: "cooking",
    activity: "食堂烹饪能耗（单份素食套餐）",
    activity_unit: "meal",
    emission_factor_value: 0.15,
    emission_factor_unit: "kgCO2e / meal",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR6-GWP100",
    geography: "CN",
    temporal_validity: "2025",
    source_name: "工程分摊假设（无公开 LCI 直接对应）",
    source_url: "",
    source_publisher: "Socrates 本地工程估算",
    license: "待核实",
    attribution: "内部假设，不对外引用为外部数据。",
    version: "0.1-draft",
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "与牛肉餐同口径的烹饪分摊假设；待本地电网/燃气因子替换。"
  },
  {
    factor_id: "F-meal-veggie-003",
    category_id: "meal_veggie",
    lifecycle_stage: "packaging",
    activity: "食堂餐具分摊（单份素食套餐）",
    activity_unit: "meal",
    emission_factor_value: 0.05,
    emission_factor_unit: "kgCO2e / meal",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR6-GWP100",
    geography: "CN",
    temporal_validity: "2025",
    source_name: "工程分摊假设（无公开 LCI 直接对应）",
    source_url: "",
    source_publisher: "Socrates 本地工程估算",
    license: "待核实",
    attribution: "内部假设，不对外引用为外部数据。",
    version: "0.1-draft",
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "与牛肉餐同口径餐具分摊；包材 LCI 待核实。"
  },
  // ------------------------------------------------------------------- snack
  {
    factor_id: "F-snack-001",
    category_id: "snack",
    lifecycle_stage: "agriculture",
    activity: "100 g 巧克力饼干：巧克力 30 g + 小麦粉 40 g + 蔗糖 15 g + 坚果 15 g",
    activity_unit: "pack",
    emission_factor_value: 1.51675,
    emission_factor_unit: "kgCO2e / pack",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR5-GWP100 (study baseline)",
    geography: "GLOBAL",
    temporal_validity: "2010 baseline / 2018 publication",
    source_name: SOURCE_POORE_NEMECEK_2018.source_name,
    source_url: SOURCE_POORE_NEMECEK_2018.source_url,
    source_publisher: SOURCE_POORE_NEMECEK_2018.source_publisher,
    license: SOURCE_POORE_NEMECEK_2018.license,
    attribution: SOURCE_POORE_NEMECEK_2018.attribution,
    version: SOURCE_POORE_NEMECEK_2018.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(3, 3, 3, 2, 3, "C"),
    data_type: "secondary",
    remarks: "P&N 加权：巧克力 0.030×46.65 + 小麦 0.040×1.57 + 蔗糖 0.015×3.20 + 坚果 0.015×0.43 = 1.51675 kgCO2e/包；配方为示例组合，实际零食按配料表加权。"
  },
  {
    factor_id: "F-snack-packaging-001",
    category_id: "snack_packaging",
    lifecycle_stage: "packaging",
    activity: "100 g 零食复合膜包装袋（约 10 g）",
    activity_unit: "pack",
    emission_factor_value: 0.05,
    emission_factor_unit: "kgCO2e / pack",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR6-GWP100",
    geography: "CN",
    temporal_validity: "2025",
    source_name: "工程分摊假设（无公开 LCI 直接对应）",
    source_url: "",
    source_publisher: "Socrates 本地工程估算",
    license: "待核实",
    attribution: "内部假设，不对外引用为外部数据。",
    version: "0.1-draft",
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "复合膜（PET/PE/铝箔）包材因子为工程假设；待 CPCD 或 ecoinvent 包材 LCI 核实替换。"
  },
  {
    factor_id: "F-snack-packaging-002",
    category_id: "snack_packaging",
    lifecycle_stage: "end_of_life",
    activity: "零食包装末端处置（混合回收/填埋）",
    activity_unit: "pack",
    emission_factor_value: 0.02,
    emission_factor_unit: "kgCO2e / pack",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR6-GWP100",
    geography: "CN",
    temporal_validity: "2025",
    source_name: "工程分摊假设（无公开 LCI 直接对应）",
    source_url: "",
    source_publisher: "Socrates 本地工程估算",
    license: "待核实",
    attribution: "内部假设，不对外引用为外部数据。",
    version: "0.1-draft",
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "混合处置工程假设；本地回收流比例未纳入。"
  },
  // -------------------------------------------------------- express packaging
  {
    factor_id: "F-express-packaging-001",
    category_id: "express_packaging",
    lifecycle_stage: "packaging",
    activity: "1 件典型快递包材组合（纸箱 + 缓冲 + 胶带）",
    activity_unit: "pack",
    emission_factor_value: 0.2,
    emission_factor_unit: "kgCO2e / pack",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR6-GWP100",
    geography: "CN",
    temporal_validity: "2025",
    source_name: "工程分摊假设（无公开 LCI 直接对应）",
    source_url: "",
    source_publisher: "Socrates 本地工程估算",
    license: "待核实",
    attribution: "内部假设，不对外引用为外部数据。",
    version: "0.1-draft",
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "首版仅包材单元，不含快递运输全链路与商品本身（报告 §8.2）；包材 LCI 待核实。"
  },
  // --------------------------------------------------------------- tap water
  {
    factor_id: "F-other-001",
    category_id: "other",
    lifecycle_stage: "use",
    activity: "500 ml 校园直饮水（处理与输配，不含容器生产/清洗）",
    activity_unit: "bottle",
    emission_factor_value: 4e-4,
    emission_factor_unit: "kgCO2e / bottle",
    interval_low: null,
    interval_high: null,
    gwp_version: "GWP100 (source LCI, version unspecified)",
    geography: "US",
    temporal_validity: "2009",
    source_name: SOURCE_FRANKLIN_2009.source_name,
    source_url: SOURCE_FRANKLIN_2009.source_url,
    source_publisher: SOURCE_FRANKLIN_2009.source_publisher,
    license: SOURCE_FRANKLIN_2009.license,
    attribution: SOURCE_FRANKLIN_2009.attribution,
    version: SOURCE_FRANKLIN_2009.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 2, 2, 3, "D"),
    data_type: "secondary",
    remarks: "Franklin 2009 以 1000 加仑为功能单位；本条目按公开文献量级换算到 500 ml，具体数值待复核。不含可重复容器生产与清洗；校园直饮水机场景未建模。"
  }
];

// ../data/src/factors/index.ts
function getAllFactors() {
  return FACTORS.map((f) => ({ ...f, dq: { ...f.dq } }));
}
function getFactorsByCategory(categoryId) {
  return FACTORS.filter((f) => f.category_id === categoryId).map((f) => ({
    ...f,
    dq: { ...f.dq }
  }));
}

// ../data/src/engine/errors.ts
function makeError(code, message, missing = []) {
  return { code, message, missing };
}

// ../data/src/engine/pedigree.ts
var GRADE_MULTIPLIERS = {
  A: [1, 1.1],
  B: [1.1, 1.25],
  C: [1.25, 1.45],
  D: [1.45, 1.7],
  E: [1.7, 2]
};
function intervalFromGrade(value, grade) {
  const [lowMul, highMul] = GRADE_MULTIPLIERS[grade];
  return [round4(value * lowMul), round4(value * highMul)];
}
function confidenceForGrade(grade, relativeWidth) {
  switch (grade) {
    case "A":
      return "high";
    case "B":
      return "medium";
    case "C":
      return relativeWidth > 0.35 ? "low" : "medium";
    case "D":
    case "E":
      return "low";
  }
}
function worstGrade(grades) {
  const rank = { A: 0, B: 1, C: 2, D: 3, E: 4 };
  let worst = "A";
  for (const g of grades) {
    if (rank[g] > rank[worst]) worst = g;
  }
  return worst;
}
function round4(n) {
  return Math.round(n * 1e4) / 1e4;
}

// ../data/src/engine/units.ts
var DEFAULT_PORTION_G = 350;
var DEFAULT_BOTTLE_ML = 500;
var DEFAULT_PACK_G = 100;
function convertActivity(quantity, requestUnit, factorActivityUnit) {
  if (!Number.isFinite(quantity) || quantity < 0) {
    return { ok: false, error: makeError("INVALID_PAYLOAD", "quantity must be a non-negative number", []) };
  }
  const unit = requestUnit;
  if (unit === factorActivityUnit) return { ok: true, result: quantity };
  if (unit === "g" && factorActivityUnit === "g") return { ok: true, result: quantity };
  if (unit === "ml" && factorActivityUnit === "ml") return { ok: true, result: quantity };
  if (factorActivityUnit === "meal") {
    if (unit === "meal") return { ok: true, result: quantity };
    if (unit === "g") return { ok: true, result: quantity / DEFAULT_PORTION_G };
  }
  if (factorActivityUnit === "bottle") {
    if (unit === "bottle") return { ok: true, result: quantity };
    if (unit === "ml") return { ok: true, result: quantity / DEFAULT_BOTTLE_ML };
  }
  if (factorActivityUnit === "pack") {
    if (unit === "pack") return { ok: true, result: quantity };
    if (unit === "g") return { ok: true, result: quantity / DEFAULT_PACK_G };
  }
  return {
    ok: false,
    error: makeError(
      "INVALID_PAYLOAD",
      `Unsupported unit conversion: request unit "${unit}" → factor unit "${factorActivityUnit}"`,
      [unit, factorActivityUnit]
    )
  };
}
function functionalUnitLabel(categoryId, activityUnit) {
  switch (activityUnit) {
    case "meal":
      return `1 份标准食堂套餐（${DEFAULT_PORTION_G} g）`;
    case "bottle":
      return `1 瓶（${DEFAULT_BOTTLE_ML} ml）`;
    case "pack":
      return `1 包（${DEFAULT_PACK_G} g）`;
    default:
      return `1 ${categoryId}`;
  }
}

// ../data/src/engine/matching.ts
var GLOBAL_GEO = "GLOBAL";
function geoScore(factorGeo, requestedGeo, preferLocal) {
  if (!requestedGeo) return 2;
  if (!preferLocal) return 2;
  if (factorGeo === requestedGeo) return 3;
  if (factorGeo === GLOBAL_GEO) return 2;
  return 1;
}
function matchFactor(factors, categoryId, stage, options = {}) {
  const { geography, preferLocal = true } = options;
  let best;
  let bestScore = -1;
  for (const f of factors) {
    if (f.category_id !== categoryId || f.lifecycle_stage !== stage) continue;
    const score = geoScore(f.geography, geography, preferLocal);
    if (score > bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return best;
}
function factorsByStage(factors, categoryId, stages) {
  const out = [];
  for (const stage of stages) {
    const hit = matchFactor(factors, categoryId, stage);
    if (hit) out.push(hit);
  }
  return out;
}

// ../data/src/engine/lca.ts
var CATEGORY_IDS = [
  "bottled_water",
  "beverage",
  "meal_beef",
  "meal_veggie",
  "snack",
  "snack_packaging",
  "express_packaging",
  "other"
];
var STAGE_LABELS = {
  agriculture: "原料/养殖",
  processing: "加工",
  transport: "运输",
  cooking: "食堂烹饪",
  packaging: "包装/餐具",
  use: "使用",
  end_of_life: "末端处置"
};
var DEFAULT_LABELS = {
  bottled_water: "瓶装水",
  beverage: "瓶装饮料",
  meal_beef: "牛肉套餐",
  meal_veggie: "素食套餐",
  snack: "包装零食",
  snack_packaging: "零食包装",
  express_packaging: "快递包装",
  other: "直饮水"
};
function isCategoryId(value) {
  return typeof value === "string" && CATEGORY_IDS.includes(value);
}
function geographyOf(attributes) {
  const g = attributes?.geography;
  return typeof g === "string" && g.length > 0 ? g : void 0;
}
function cite(factor) {
  return {
    factor_id: factor.factor_id,
    stage: factor.lifecycle_stage,
    source_name: factor.source_name,
    source_url: factor.source_url,
    license: factor.license,
    dq: factor.dq,
    valid_from: factor.valid_from,
    valid_to: factor.valid_to
  };
}
function calculateStages(request, factors) {
  const geography = geographyOf(request.attributes);
  const stages = factorsByStage(factors, request.category_id, LIFECYCLE_STAGES);
  const calcs = [];
  for (const factor of stages) {
    const amount = convertActivity(request.quantity, request.unit, factor.activity_unit);
    if (!amount.ok) return amount;
    const value = round4(factor.emission_factor_value * amount.result);
    let interval;
    if (factor.interval_low != null && factor.interval_high != null) {
      interval = [
        round4(factor.interval_low * amount.result),
        round4(factor.interval_high * amount.result)
      ];
    } else {
      interval = intervalFromGrade(value, factor.dq.overall);
    }
    calcs.push({
      factor,
      amount: amount.result,
      phase: {
        stage: factor.lifecycle_stage,
        label: STAGE_LABELS[factor.lifecycle_stage],
        value,
        interval
      }
    });
  }
  return { ok: true, result: calcs };
}
function calculateFootprint(request, factors = getAllFactors()) {
  if (!isCategoryId(request.category_id)) {
    return {
      ok: false,
      error: makeError("INVALID_PAYLOAD", `非法品类码：${String(request.category_id)}`, [
        String(request.category_id)
      ])
    };
  }
  const categoryFactors = factors.filter((f) => f.category_id === request.category_id);
  if (categoryFactors.length === 0) {
    return {
      ok: false,
      error: makeError(
        "FACTOR_NOT_FOUND",
        "未找到该品类的可用排放因子，已停止估算；请补充产品属性或选择已覆盖品类。",
        [request.category_id]
      )
    };
  }
  const stages = calculateStages(request, categoryFactors);
  if (!stages.ok) return stages;
  const calcs = stages.result;
  if (calcs.length === 0) {
    return {
      ok: false,
      error: makeError(
        "FACTOR_NOT_FOUND",
        "该品类在已覆盖阶段中无可用因子；已停止估算。",
        [request.category_id]
      )
    };
  }
  const totalValue = round4(calcs.reduce((sum, c) => sum + c.phase.value, 0));
  const totalLow = round4(calcs.reduce((sum, c) => sum + c.phase.interval[0], 0));
  const totalHigh = round4(calcs.reduce((sum, c) => sum + c.phase.interval[1], 0));
  const width = totalValue > 0 ? (totalHigh - totalLow) / totalValue : 0;
  const overall = worstGrade(calcs.map((c) => c.factor.dq.overall));
  const confidence = confidenceForGrade(overall, width);
  const geography = geographyOf(request.attributes);
  const notes = [];
  if (geography && calcs.some((c) => c.factor.geography !== geography && c.factor.geography !== "GLOBAL")) {
    notes.push("地理代表性偏弱：部分因子为全球/欧洲平均场景，本地餐食或产品需谨慎解读。");
  }
  notes.push("区间为保守包络估计：各阶段下限、上限分别求和，未做对数正态传播（报告 §8.5）。");
  const covered = new Set(calcs.map((c) => c.factor.lifecycle_stage));
  const uncovered = LIFECYCLE_STAGES.filter((s) => !covered.has(s));
  if (uncovered.length > 0) {
    notes.push(`未覆盖阶段：${uncovered.map((s) => STAGE_LABELS[s]).join("、")}。`);
  }
  const activityUnit = calcs[0]?.factor.activity_unit ?? "item";
  return {
    ok: true,
    result: {
      functional_unit: functionalUnitLabel(request.category_id, activityUnit),
      total: {
        value: totalValue,
        unit: "kgCO2e",
        interval: [totalLow, totalHigh],
        confidence
      },
      phases: calcs.map((c) => c.phase),
      factors: calcs.map((c) => cite(c.factor)),
      data_quality: { overall, notes },
      disclaimer: "本结果为归因型 LCA 估算区间，用于教育对话，不作为采购、认证或标签声明依据。"
    }
  };
}
function intervalsOverlap(a, b) {
  return a[0] <= b[1] && b[0] <= a[1];
}
function compareFootprints(items, factors = getAllFactors()) {
  if (items.length < 2) {
    return {
      ok: false,
      error: makeError("INVALID_PAYLOAD", "对比至少需要 2 项。", [])
    };
  }
  const results = [];
  const caveats = ["区间存在重叠时不宣称绝对优劣。", "地理与季节差异未完全纳入。"];
  let functionalUnit = "";
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const request = {
      category_id: item.category_id,
      attributes: item.attributes ?? {},
      quantity: item.quantity,
      unit: item.unit
    };
    const calc = calculateFootprint(request, factors);
    if (!calc.ok) {
      return {
        ok: false,
        error: {
          ...calc.error,
          missing: [`#${i} ${item.label ?? DEFAULT_LABELS[item.category_id]}`, ...calc.error.missing]
        }
      };
    }
    const footprint = calc.result;
    if (i === 0) functionalUnit = footprint.functional_unit;
    results.push({
      index: i,
      label: item.label ?? DEFAULT_LABELS[item.category_id],
      footprint: {
        value: footprint.total.value,
        unit: footprint.total.unit,
        interval: footprint.total.interval
      },
      dq: footprint.data_quality.overall
    });
    caveats.push(...footprint.data_quality.notes);
  }
  let overlap = false;
  for (let i = 0; i < results.length && !overlap; i += 1) {
    for (let j = i + 1; j < results.length; j += 1) {
      if (intervalsOverlap(results[i].footprint.interval, results[j].footprint.interval)) {
        overlap = true;
        break;
      }
    }
  }
  return {
    ok: true,
    result: { functional_unit: functionalUnit, items: results, overlap, caveats }
  };
}

// build/shared/rest.ts
var RestError = class extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "RestError";
  }
};
function requireConfigured(env) {
  const url = env.SUPABASE_URL?.replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new RestError(500, "INTERNAL", "Supabase environment is not configured");
  }
  return { url, key };
}
async function restInsert(env, table, record) {
  const { url, key } = requireConfigured(env);
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(record)
  });
  if (!response.ok) {
    throw new RestError(response.status, "UPSTREAM_ERROR", `REST insert ${table} failed (HTTP ${response.status})`);
  }
  const rows = await response.json();
  return rows[0];
}

// build/shared/executor.ts
function asRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
  return value;
}
function unitForCategory(categoryId) {
  if (categoryId.startsWith("meal")) return "meal";
  if (categoryId === "bottled_water" || categoryId === "beverage") return "bottle";
  if (categoryId === "snack" || categoryId === "snack_packaging" || categoryId === "express_packaging") {
    return "pack";
  }
  return "item";
}
function toFactorRecord(f) {
  return {
    factor_id: f.factor_id,
    stage: f.lifecycle_stage,
    activity: f.activity,
    activity_unit: f.activity_unit,
    factor_value: f.emission_factor_value,
    factor_unit: f.emission_factor_unit,
    interval_low: f.interval_low,
    interval_high: f.interval_high,
    gwp_version: f.gwp_version,
    geography: f.geography,
    temporal: f.temporal_validity,
    dq: f.dq,
    source_name: f.source_name,
    source_url: f.source_url,
    license: f.license,
    attribution: f.attribution,
    version: f.version,
    valid_from: f.valid_from,
    valid_to: f.valid_to,
    data_type: f.data_type
  };
}
function ok(result, signals) {
  return { ok: true, result, signals };
}
function fail2(error) {
  return { ok: false, error };
}
function createToolExecutor(deps) {
  const { env, sessionId } = deps;
  return async function execute(tool, rawArgs) {
    const args = asRecord(rawArgs);
    if (!args) return fail2("INVALID_PAYLOAD");
    switch (tool) {
      case "extract_product_attributes": {
        const freeText = typeof args.free_text === "string" ? args.free_text.trim() : "";
        if (freeText.length === 0) return fail2("INVALID_PAYLOAD");
        return ok({
          product_name: freeText,
          brand: null,
          category_hint: "other",
          ingredients: [],
          package_format: "other",
          quantity_text: null,
          confidence: 0.4,
          missing_fields: ["brand", "ingredients", "package_format"]
        });
      }
      case "map_to_category": {
        const attributes = asRecord(args.attributes);
        if (!attributes) return fail2("INVALID_PAYLOAD");
        const hint = typeof attributes.category_hint === "string" ? attributes.category_hint : "other";
        const categoryId = isCategoryId(hint) ? hint : "other";
        const confidence = typeof attributes.confidence === "number" ? attributes.confidence : 0.5;
        return ok(
          {
            category_id: categoryId,
            category_path: [categoryId],
            mapped: categoryId !== "other",
            match_confidence: confidence,
            alternatives: [],
            need_clarification: confidence < 0.6,
            clarification_question: confidence < 0.6 ? "方便补充一下产品名称、配料或包装规格吗？" : null
          },
          { confidence, needClarification: confidence < 0.6 }
        );
      }
      case "get_emission_factors": {
        const categoryId = typeof args.category_id === "string" ? args.category_id : "";
        if (!isCategoryId(categoryId)) return fail2("INVALID_PAYLOAD");
        const factors = getFactorsByCategory(categoryId).map(toFactorRecord);
        return ok({
          factors,
          selection_note: factors.length > 0 ? "本地因子库匹配结果" : "该品类暂无本地因子",
          missing_stages: []
        });
      }
      case "calculate_footprint": {
        const categoryId = typeof args.category_id === "string" ? args.category_id : "";
        const attributes = asRecord(args.attributes) ?? {};
        const quantity = typeof args.quantity === "number" ? args.quantity : 1;
        const unit = typeof args.unit === "string" ? args.unit : unitForCategory(categoryId);
        const outcome = calculateFootprint({
          category_id: categoryId,
          attributes,
          quantity,
          unit
        });
        if (!outcome.ok) {
          return fail2(outcome.error.code);
        }
        return ok(outcome.result, {
          confidence: 0.5,
          nextState: "DECISION"
        });
      }
      case "compare_alternatives": {
        const rawItems = Array.isArray(args.items) ? args.items : [];
        const items = rawItems.map((item, index) => {
          const record = asRecord(item) ?? {};
          const label = typeof record.label === "string" ? record.label : `选项 ${index + 1}`;
          const itemAttrs = asRecord(record.attributes) ?? {};
          const isReusable = itemAttrs.reusable === true || /直饮|自带|水杯|tap/i.test(label);
          const categoryId = isReusable ? "other" : typeof record.category_id === "string" ? record.category_id : "other";
          return {
            label,
            category_id: categoryId,
            attributes: isReusable ? { ...itemAttrs, reusable: true } : itemAttrs,
            quantity: 1,
            unit: isReusable ? "bottle" : unitForCategory(categoryId)
          };
        });
        const outcome = compareFootprints(items);
        if (!outcome.ok) return fail2(outcome.error.code);
        return ok(outcome.result, { commitmentMade: false });
      }
      case "rank_by_5r": {
        const alternatives = Array.isArray(args.alternatives) ? args.alternatives : [];
        const fiveR = [
          { step: "Refuse", available: false, note: "本场景无拒绝项" },
          { step: "Reduce", available: true, note: "选择更低排放的植物源菜品或减量" },
          { step: "Reuse", available: true, note: "自带可重复餐具/杯具" },
          { step: "Recycle", available: true, note: "剩余包装按校园回收流处置" },
          { step: "Rot", available: true, note: "餐余投入厨余/堆肥回收点" }
        ];
        const ranking = alternatives.map((_, index) => ({
          index,
          level: "Reduce",
          score: Math.max(0, 1 - index * 0.25),
          note: "—"
        }));
        return ok({ five_r: fiveR, ranking });
      }
      case "log_commitment": {
        const commitmentText = typeof args.commitment_text === "string" ? args.commitment_text.trim() : "";
        if (commitmentText.length === 0) return fail2("INVALID_PAYLOAD");
        const followUpDays = typeof args.follow_up_days === "number" ? args.follow_up_days : 7;
        const created = /* @__PURE__ */ new Date();
        const due = new Date(created.getTime() + followUpDays * 24 * 60 * 60 * 1e3);
        const row = await restInsert(env, "commitments", {
          session_id: sessionId,
          profile_id: null,
          commitment_text: commitmentText,
          category_id: typeof args.category_id === "string" ? args.category_id : null,
          alternative: typeof args.alternative === "string" ? args.alternative : null,
          barrier: typeof args.barrier === "string" ? args.barrier : null,
          plan: typeof args.plan === "string" ? args.plan : null,
          self_efficacy: typeof args.self_efficacy === "number" ? args.self_efficacy : null,
          follow_up_days: followUpDays,
          follow_up_due: due.toISOString(),
          status: "active",
          consent_recorded: false
        });
        const record = row;
        return ok(
          {
            commitment_id: record.id ?? "cmt_unknown",
            created_at: created.toISOString(),
            follow_up_due: due.toISOString(),
            status: "active",
            consent_recorded: false
          },
          { commitmentMade: true, nextState: "COMMITMENT" }
        );
      }
      default:
        return fail2("INVALID_PAYLOAD");
    }
  };
}

// build/entries/chat.ts
function seedMock(llm, message) {
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
            unit: "meal"
          }
        },
        {
          id: "c2",
          name: "compare_alternatives",
          arguments: {
            items: [
              { label: "牛肉套餐", category_id: "meal_beef", attributes: { portion_g: 350 } },
              { label: "素食套餐", category_id: "meal_veggie", attributes: { portion_g: 350 } }
            ]
          }
        }
      ]
    });
    llm.enqueue({
      content: "两份套餐已按同一功能单位核对，区间与对比结论已挂载到信息卡；我们先看看你愿意尝试的小改变。"
    });
    return;
  }
  if (/水|瓶|饮料|snack|零食/.test(message)) {
    llm.enqueue({
      toolCalls: [
        { id: "c1", name: "extract_product_attributes", arguments: { free_text: message } }
      ]
    });
    llm.enqueue({
      content: "我先记录下你说的产品；方便补充品牌、配料或包装规格吗，这样可以匹配到更合适的本地因子。"
    });
    return;
  }
  llm.enqueue({
    content: "听起来你在留意日常选择；方便说说最近一次在食堂或便利店的购买场景吗？"
  });
}
function sanitizeModelHeader(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 120) return null;
  return /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : null;
}
Deno.serve(async (request) => {
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
  const raw = body.value;
  const env = envObject();
  const modelOverride = sanitizeModelHeader(request.headers.get("x-llm-model"));
  const profile = loadActiveProfile(env);
  let llm;
  if (profile) {
    llm = createAdapterForProfile(profile, modelOverride ?? void 0);
  } else {
    llm = createLlmAdapter({}, env);
    if (llm instanceof MockLlm) seedMock(llm, raw.message);
  }
  const sessionId = raw.session_id ?? `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const context = {
    entryScene: raw.context?.entry_scene,
    productHint: raw.context?.product_hint ?? null
  };
  const orchestrator = new MiOrchestrator({
    llm,
    executor: createToolExecutor({ env, sessionId }),
    sessionId,
    locale: raw.locale,
    mode: raw.mode
  });
  let events;
  try {
    events = await orchestrator.handleUserMessage(raw.message, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    events = [
      { event: "error", data: { code: "INTERNAL", message } },
      { event: "done", data: { finish_reason: "error", turn: orchestrator.turn } }
    ];
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(encodeSse(event)));
      }
      controller.close();
    }
  });
  return new Response(stream, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
});
