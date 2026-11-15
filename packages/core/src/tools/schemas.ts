/**
 * JSON Schema definitions for the seven registered tools (report §4).
 * These constants are sent to the LLM gateway and consumed by the manual
 * schema validator in `validation.ts`. Keep them aligned with `types.ts`.
 */

import type { ToolName } from "../mi/states";

/** JSON Schema subset used across the tool registry. */
export interface JsonSchema {
  type?: string | string[];
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  additionalProperties?: boolean;
  default?: unknown;
  format?: string;
  description?: string;
}

export interface ToolDefinition {
  name: ToolName;
  description: string;
  parameters: JsonSchema;
  result_schema: JsonSchema;
}

// --- 4.1 extract_product_attributes ---------------------------------------

export const extractProductAttributesSchema: ToolDefinition = {
  name: "extract_product_attributes",
  description:
    "从用户自由文本中抽取产品属性（名称、品牌、配料、规格、包装形态），输出结构化属性与置信度；不做排放估算。",
  parameters: {
    type: "object",
    required: ["free_text"],
    properties: {
      free_text: {
        type: "string",
        minLength: 1,
        maxLength: 1000,
        description: "用户关于产品的原始描述",
      },
      image_ocr: {
        type: ["string", "null"],
        description: "可选：图片识别得到的文本，演示期通常为 null",
      },
    },
    additionalProperties: false,
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
          "other",
        ],
      },
      ingredients: { type: "array", items: { type: "string" } },
      package_format: {
        type: "string",
        enum: ["bottle", "can", "cup", "tray", "bag", "wrapper", "reusable", "other"],
      },
      quantity_text: { type: ["string", "null"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      missing_fields: { type: "array", items: { type: "string" } },
    },
    additionalProperties: false,
  },
};

// --- 4.2 map_to_category ---------------------------------------------------

export const mapToCategorySchema: ToolDefinition = {
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
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
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
            reason: { type: "string" },
          },
          additionalProperties: false,
        },
      },
      need_clarification: { type: "boolean" },
      clarification_question: { type: ["string", "null"] },
    },
    additionalProperties: false,
  },
};

// --- 4.3 get_emission_factors ---------------------------------------------

export const getEmissionFactorsSchema: ToolDefinition = {
  name: "get_emission_factors",
  description:
    "检索内部因子库中匹配品类与条件的排放因子，返回因子记录、区间、DQ、来源与许可证；不做求和计算。",
  parameters: {
    type: "object",
    required: ["category_id"],
    properties: {
      category_id: { type: "string" },
      lifecycle_stage: {
        type: "string",
        enum: ["agriculture", "processing", "transport", "cooking", "packaging", "use", "end_of_life", "all"],
      },
      geography: { type: "string", description: "ISO 国家/地区码，如 CN、FR" },
      season: { type: ["string", "null"] },
      prefer_local: { type: "boolean", default: true },
    },
    additionalProperties: false,
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
            "data_type",
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
                overall: { type: "string", enum: ["A", "B", "C", "D", "E"] },
              },
              additionalProperties: false,
            },
            source_name: { type: "string" },
            source_url: { type: "string" },
            license: { type: "string" },
            attribution: { type: "string" },
            version: { type: "string" },
            valid_from: { type: "string", format: "date" },
            valid_to: { type: ["string", "null"] },
            data_type: { type: "string", enum: ["primary", "secondary"] },
          },
          additionalProperties: false,
        },
      },
      selection_note: { type: "string" },
      missing_stages: { type: "array", items: { type: "string" } },
    },
    additionalProperties: false,
  },
};

// --- 4.4 calculate_footprint ----------------------------------------------

export const calculateFootprintSchema: ToolDefinition = {
  name: "calculate_footprint",
  description:
    "调用后端确定性 LCA 引擎计算单一产品/餐食的碳足迹；返回功能单位、总量区间、阶段拆分、因子引用与 DQ。引擎不生成新因子。",
  parameters: {
    type: "object",
    required: ["category_id", "attributes", "quantity", "unit"],
    properties: {
      category_id: { type: "string" },
      attributes: { type: "object", additionalProperties: true },
      quantity: { type: "number", minimum: 0 },
      unit: { type: "string", enum: ["meal", "bottle", "can", "pack", "item", "g", "ml"] },
      factor_set_id: { type: ["string", "null"] },
    },
    additionalProperties: false,
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
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        additionalProperties: false,
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
            interval: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
          },
          additionalProperties: false,
        },
      },
      factors: { type: "array", items: { type: "object", additionalProperties: true } },
      data_quality: {
        type: "object",
        required: ["overall", "notes"],
        properties: {
          overall: { type: "string", enum: ["A", "B", "C", "D", "E"] },
          notes: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
      disclaimer: { type: "string" },
    },
    additionalProperties: false,
  },
};

// --- 4.5 compare_alternatives ----------------------------------------------

export const compareAlternativesSchema: ToolDefinition = {
  name: "compare_alternatives",
  description:
    "在同一功能单位下对比两件及以上备选，返回各自足迹区间与可比性说明；区间重叠时不宣称绝对优劣。",
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
            category_id: { type: "string" },
            attributes: { type: "object", additionalProperties: true },
          },
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
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
                interval: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
              },
              additionalProperties: false,
            },
            dq: { type: "string" },
          },
          additionalProperties: false,
        },
      },
      overlap: { type: "boolean" },
      caveats: { type: "array", items: { type: "string" } },
    },
    additionalProperties: false,
  },
};

// --- 4.6 rank_by_5r --------------------------------------------------------

export const rankBy5rSchema: ToolDefinition = {
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
            attributes: { type: "object", additionalProperties: true },
          },
          additionalProperties: false,
        },
      },
      weights: { type: ["object", "null"], description: "预留：用户偏好权重，首版不启用" },
    },
    additionalProperties: false,
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
            mapped_labels: { type: "array", items: { type: "string" } },
          },
          additionalProperties: false,
        },
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
            note: { type: "string" },
          },
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  },
};

// --- 4.7 log_commitment ----------------------------------------------------

export const logCommitmentSchema: ToolDefinition = {
  name: "log_commitment",
  description: "登记用户自愿作出的减碳承诺与跟进计划；记录自助意愿（self-efficacy）与障碍；不做强制追踪。",
  parameters: {
    type: "object",
    required: ["commitment_text", "category_id", "alternative"],
    properties: {
      commitment_text: { type: "string", minLength: 1, maxLength: 300 },
      category_id: { type: "string" },
      alternative: { type: "string" },
      barrier: { type: ["string", "null"] },
      plan: { type: ["string", "null"] },
      self_efficacy: { type: "integer", minimum: 1, maximum: 5 },
      follow_up_days: { type: "integer", minimum: 1, maximum: 90 },
    },
    additionalProperties: false,
  },
  result_schema: {
    type: "object",
    required: ["commitment_id", "created_at", "follow_up_due", "status", "consent_recorded"],
    properties: {
      commitment_id: { type: "string" },
      created_at: { type: "string", format: "date-time" },
      follow_up_due: { type: ["string", "null"], format: "date-time" },
      status: { type: "string", enum: ["active", "cancelled"] },
      consent_recorded: { type: "boolean" },
    },
    additionalProperties: false,
  },
};

export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  extractProductAttributesSchema,
  mapToCategorySchema,
  getEmissionFactorsSchema,
  calculateFootprintSchema,
  compareAlternativesSchema,
  rankBy5rSchema,
  logCommitmentSchema,
];

const DEFINITION_INDEX: ReadonlyMap<ToolName, ToolDefinition> = new Map(
  TOOL_DEFINITIONS.map((def) => [def.name, def]),
);

export function getToolDefinition(name: ToolName): ToolDefinition {
  const def = DEFINITION_INDEX.get(name);
  if (!def) throw new Error(`Unknown tool: ${name}`);
  return def;
}

export function listToolNames(): ToolName[] {
  return TOOL_DEFINITIONS.map((def) => def.name);
}
