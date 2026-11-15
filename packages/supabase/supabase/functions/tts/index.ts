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

// ../core/src/tools/schemas.ts
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
      category_id: { type: "string" },
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
      category_id: { type: "string" },
      attributes: { type: "object", additionalProperties: true },
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
            category_id: { type: "string" },
            attributes: { type: "object", additionalProperties: true }
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
      category_id: { type: "string" },
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

// ../core/src/adapters/tts/errors.ts
var TtsError = class extends Error {
  kind;
  status;
  cause;
  constructor(kind, message, status, cause) {
    super(message);
    this.name = "TtsError";
    this.kind = kind;
    this.status = status;
    this.cause = cause;
  }
};

// ../core/src/adapters/tts/split.ts
var SENTENCE_SPLIT_RE = /[^。！？!?；;\n]+[。！？!?；;]?/g;
function splitBySentence(text, maxChars = 200) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];
  const sentences = trimmed.match(SENTENCE_SPLIT_RE) ?? [trimmed];
  const chunks = [];
  for (const sentence of sentences) {
    const clean = sentence.trim();
    if (clean.length === 0) continue;
    if (clean.length <= maxChars) {
      chunks.push(clean);
      continue;
    }
    for (let i = 0; i < clean.length; i += maxChars) {
      chunks.push(clean.slice(i, i + maxChars));
    }
  }
  return chunks;
}

// ../core/src/adapters/tts/mock-tts.ts
var MockTts = class {
  provider = "mock";
  available = true;
  splitBySentence(text, maxChars) {
    return splitBySentence(text, maxChars);
  }
  async synthesize(request) {
    const format = request.format ?? "audio/mp3";
    const voice = request.voice ?? "zh-CN-mock";
    const sentences = this.splitBySentence(request.text);
    const chunks = sentences.map((_, index) => ({ seq: index + 1, dataBase64: "" }));
    return {
      chunks,
      visemes: [],
      characters: request.text.length,
      voice,
      format
    };
  }
};

// ../core/src/adapters/tts/no-tts.ts
var NoTts = class {
  provider = "none";
  available = false;
  splitBySentence(text, maxChars) {
    return splitBySentence(text, maxChars);
  }
  async synthesize(_request) {
    throw new TtsError("unavailable", "TTS is disabled; subtitles are retained as fallback.");
  }
};

// ../core/src/adapters/tts/volcano.ts
function encodingFor(format) {
  return format === "audio/wav" ? "wav" : "mp3";
}
var VolcanoTts = class {
  provider = "volcano";
  available = true;
  config;
  fetchImpl;
  constructor(config) {
    this.assertConfigured(config);
    this.config = config;
    this.fetchImpl = config.fetchImpl;
  }
  assertConfigured(config) {
    for (const field of ["appId", "accessToken", "cluster", "voiceType"]) {
      const value = config[field];
      if (!value || value.trim().length === 0) {
        throw new TtsError(
          "missing_credentials",
          `Volcano TTS is missing ${field}; set VOLC_TTS_${field.toUpperCase()} or inject it.`
        );
      }
    }
  }
  splitBySentence(text, maxChars) {
    return splitBySentence(text, maxChars);
  }
  /** Map an internal utterance to the Volcano request body. */
  buildPayload(chunk, index, format, sessionId) {
    return {
      app: {
        appid: this.config.appId,
        token: this.config.accessToken,
        cluster: this.config.cluster
      },
      user: { uid: sessionId ?? "socrates-demo" },
      audio: {
        voice_type: this.config.voiceType,
        encoding: encodingFor(format)
      },
      request: {
        reqid: `tts_${Date.now().toString(36)}_${index}`,
        text: chunk,
        operation: "query"
      }
    };
  }
  parseAudioBase64(raw) {
    if (typeof raw !== "object" || raw === null) {
      throw new TtsError("invalid_response", "Volcano TTS returned a non-object payload");
    }
    const candidate = raw.data;
    if (typeof candidate !== "string" || candidate.length === 0) {
      throw new TtsError("invalid_response", "Volcano TTS payload has no audio data");
    }
    return candidate;
  }
  async synthesize(request) {
    this.assertConfigured(this.config);
    const format = request.format ?? this.config.defaultFormat ?? "audio/mp3";
    const voice = request.voice ?? this.config.voiceType;
    const sentences = this.splitBySentence(request.text);
    if (!this.fetchImpl || !this.config.endpoint) {
      throw new TtsError(
        "unavailable",
        "Volcano TTS upstream is not wired yet; credentials and endpoint are pending."
      );
    }
    const chunks = [];
    for (let i = 0; i < sentences.length; i += 1) {
      const payload = this.buildPayload(sentences[i], i + 1, format, request.sessionId);
      const response = await this.fetchImpl(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.accessToken}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new TtsError("upstream", `Volcano TTS failed (HTTP ${response.status})`, response.status);
      }
      const payloadJson = await response.json();
      chunks.push({ seq: i + 1, dataBase64: this.parseAudioBase64(payloadJson) });
    }
    return {
      chunks,
      visemes: [],
      characters: request.text.length,
      voice,
      format
    };
  }
};

// ../core/src/adapters/tts/factory.ts
function createTtsAdapter(config = {}, env = process.env) {
  const provider = (config.provider ?? env.TTS_PROVIDER ?? "mock").trim().toLowerCase();
  switch (provider) {
    case "none":
    case "off":
      return new NoTts();
    case "volcano":
    case "volcengine":
      return new VolcanoTts({
        appId: config.appId ?? env.VOLC_TTS_APP_ID ?? "",
        accessToken: config.accessToken ?? env.VOLC_TTS_ACCESS_TOKEN ?? "",
        cluster: config.cluster ?? env.VOLC_TTS_CLUSTER ?? "",
        voiceType: config.voiceType ?? env.VOLC_TTS_VOICE_TYPE ?? "",
        endpoint: config.endpoint
      });
    case "mock":
    case "":
    default:
      return new MockTts();
  }
}
function createResilientTts(config = {}, env = process.env) {
  const allPresent = [config.appId ?? env.VOLC_TTS_APP_ID, config.accessToken ?? env.VOLC_TTS_ACCESS_TOKEN, config.cluster ?? env.VOLC_TTS_CLUSTER, config.voiceType ?? env.VOLC_TTS_VOICE_TYPE].every(
    (value) => typeof value === "string" && value.trim().length > 0
  );
  if (!allPresent) return new NoTts();
  return createTtsAdapter({ ...config, provider: "volcano" }, env);
}

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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id",
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

// build/entries/tts.ts
var FORMATS = /* @__PURE__ */ new Set(["audio/mp3", "audio/wav"]);
function mapTtsError(error) {
  switch (error.kind) {
    case "timeout":
      return { code: "UPSTREAM_TIMEOUT", status: 504, retryAfter: null };
    case "rate_limit":
      return { code: "RATE_LIMITED", status: 429, retryAfter: 5 };
    case "unavailable":
    case "missing_credentials":
      return { code: "SPEECH_UNAVAILABLE", status: 503, retryAfter: null };
    default:
      return { code: "UPSTREAM_ERROR", status: 502, retryAfter: null };
  }
}
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "POST") {
    return errorResponse("INVALID_PAYLOAD", "Method not allowed; use POST", [
      { field: "method", reason: "expected POST" }
    ]);
  }
  const body = await readJsonBody(request);
  if (!body.ok) return errorResponse("INVALID_PAYLOAD", "请求体不满足 schema", body.issues);
  const raw = body.value;
  const issues = [];
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (text.length === 0) issues.push({ field: "text", reason: "text is required" });
  else if (text.length > 1e3) issues.push({ field: "text", reason: "text exceeds 1000 characters" });
  const format = typeof raw.format === "string" && FORMATS.has(raw.format) ? raw.format : "audio/mp3";
  if (raw.format !== void 0 && !FORMATS.has(raw.format)) {
    issues.push({ field: "format", reason: "format must be audio/mp3 or audio/wav" });
  }
  if (issues.length > 0) return errorResponse("INVALID_PAYLOAD", "请求字段不满足 schema", issues);
  const env = envObject();
  const adapter = createResilientTts({}, env);
  const encoder = new TextEncoder();
  let lines;
  try {
    if (!adapter.available) {
      lines = [
        `event: tts_done
data: ${JSON.stringify({
          seq_total: 0,
          characters: text.length,
          voice: raw.voice ?? "none",
          provider: adapter.provider,
          available: false,
          subtitle: text,
          format
        })}

`
      ];
    } else {
      const result = await adapter.synthesize({
        sessionId: raw.session_id,
        text,
        voice: raw.voice,
        locale: raw.locale,
        format
      });
      lines = [];
      for (const viseme of result.visemes) {
        lines.push(`event: viseme
data: ${JSON.stringify(viseme)}

`);
      }
      for (const chunk of result.chunks) {
        lines.push(
          `event: audio
data: ${JSON.stringify({ chunk: chunk.dataBase64, seq: chunk.seq })}

`
        );
      }
      lines.push(
        `event: tts_done
data: ${JSON.stringify({
          seq_total: result.chunks.length,
          characters: result.characters,
          voice: result.voice,
          provider: adapter.provider,
          available: true,
          format: result.format
        })}

`
      );
    }
  } catch (error) {
    if (error instanceof TtsError) {
      const mapped = mapTtsError(error);
      return errorResponse(mapped.code, error.message, [], mapped.retryAfter);
    }
    const message = error instanceof Error ? error.message : "internal error";
    return errorResponse("SPEECH_UNAVAILABLE", message);
  }
  const stream = new ReadableStream({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line));
      controller.close();
    }
  });
  return new Response(stream, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no"
    }
  });
});
