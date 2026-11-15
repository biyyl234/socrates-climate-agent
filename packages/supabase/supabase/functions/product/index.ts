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
async function restSelect(env, table, query) {
  const { url, key } = requireConfigured(env);
  const endpoint = `${url}/rest/v1/${table}?${query}`;
  const response = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" }
  });
  if (!response.ok) {
    throw new RestError(response.status, "UPSTREAM_ERROR", `REST select ${table} failed (HTTP ${response.status})`);
  }
  return await response.json();
}

// build/entries/product.ts
var OFF_BASE = "https://world.openfoodfacts.org";
var OFF_UA = "SocratesCampusLab/0.1 (educational demo; campus consumption lab)";
function splitList(value) {
  if (typeof value !== "string") return [];
  return value.split(",").map((item) => item.trim()).filter((item) => item.length > 0);
}
function normalizeOffProduct(p) {
  const name = typeof p.product_name === "string" && p.product_name.trim() ? p.product_name : null;
  const brands = Array.isArray(p.brands_tags) ? p.brands_tags : splitList(p.brands);
  const categories = Array.isArray(p.categories_tags) ? p.categories_tags : splitList(p.categories);
  const ingredients = Array.isArray(p.ingredients_tags) ? p.ingredients_tags : splitList(p.ingredients_text);
  const barcode = typeof p.code === "string" ? p.code : null;
  const imageUrl = (typeof p.image_front_url === "string" ? p.image_front_url : null) ?? (typeof p.image_url === "string" ? p.image_url : null);
  const missing = [];
  if (!name) missing.push("name");
  if (brands.length === 0) missing.push("brands");
  if (ingredients.length === 0) missing.push("ingredients");
  return {
    barcode,
    name,
    brands,
    categories,
    ingredients,
    image_url: imageUrl,
    quantity: typeof p.quantity === "string" ? p.quantity : null,
    serving_size: typeof p.serving_size === "string" ? p.serving_size : null,
    off_source_url: barcode ? `${OFF_BASE}/product/${barcode}` : null,
    data_quality: {
      has_nutrition_data: typeof p.nutrition_grade_fr === "string" || typeof p.nutriscore_grade === "string",
      verified: p.checked === 1 || p.verified === 1,
      missing_fields: missing
    }
  };
}
function normalizeLocalProduct(row) {
  return {
    barcode: typeof row.barcode === "string" ? row.barcode : null,
    name: typeof row.name === "string" ? row.name : null,
    brands: Array.isArray(row.brands) ? row.brands : [],
    categories: Array.isArray(row.categories) ? row.categories : [],
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    quantity: typeof row.quantity === "string" ? row.quantity : null,
    serving_size: typeof row.serving_size === "string" ? row.serving_size : null,
    off_source_url: null,
    data_quality: {
      has_nutrition_data: false,
      verified: false,
      missing_fields: []
    }
  };
}
async function fetchOff(barcode) {
  const endpoint = `${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const response = await fetch(endpoint, { headers: { "User-Agent": OFF_UA } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`OFF barcode lookup failed (HTTP ${response.status})`);
  const payload = await response.json();
  if (payload.status !== 1 || !payload.product) return null;
  return normalizeOffProduct(payload.product);
}
async function searchOff(query) {
  const endpoint = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(
    query
  )}&json=1&page_size=12&fields=code,product_name,brands_tags,categories_tags,ingredients_tags,image_front_url,quantity,serving_size,nutrition_grade_fr,checked`;
  const response = await fetch(endpoint, { headers: { "User-Agent": OFF_UA } });
  if (!response.ok) throw new Error(`OFF search failed (HTTP ${response.status})`);
  const payload = await response.json();
  return (payload.products ?? []).map(normalizeOffProduct);
}
async function localByBarcode(env, barcode) {
  const rows = await restSelect(
    env,
    "products",
    `barcode=eq.${encodeURIComponent(barcode)}&select=*&limit=1`
  );
  return rows[0] ? normalizeLocalProduct(rows[0]) : null;
}
async function localByCategory(env, category) {
  const rows = await restSelect(
    env,
    "products",
    `categories=cs.{${encodeURIComponent(category)}}&select=*&limit=12`
  );
  return rows.map(normalizeLocalProduct);
}
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "GET" && request.method !== "POST") {
    return errorResponse("INVALID_PAYLOAD", "Method not allowed; use GET or POST", [
      { field: "method", reason: "expected GET or POST" }
    ]);
  }
  const env = envObject();
  let barcode;
  let query;
  let category;
  if (request.method === "GET") {
    const url = new URL(request.url);
    barcode = url.searchParams.get("barcode") ?? void 0;
    query = url.searchParams.get("query") ?? void 0;
    category = url.searchParams.get("category") ?? void 0;
  } else {
    const body = await readJsonBody(request);
    if (!body.ok) return errorResponse("INVALID_PAYLOAD", "请求体不满足 schema", body.issues);
    const raw = body.value;
    barcode = raw.barcode;
    query = raw.query;
    category = raw.category;
  }
  if (!barcode && !query && !category) {
    return errorResponse("INVALID_PAYLOAD", "需要 barcode、query 或 category 之一", [
      { field: "query", reason: "one of barcode/query/category is required" }
    ]);
  }
  try {
    if (barcode) {
      let product = null;
      let source = "none";
      try {
        product = await fetchOff(barcode);
        if (product) source = "open_food_facts";
      } catch {
        product = null;
      }
      if (!product) {
        product = await localByBarcode(env, barcode);
        if (product) source = "local_snapshot";
      }
      if (!product) {
        return errorResponse("PRODUCT_NOT_FOUND", "条码在外部源与本地快照均无匹配", [
          { field: "barcode", reason: barcode }
        ]);
      }
      return new Response(
        JSON.stringify({ matched: true, source, product, factor_candidates: [] }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" } }
      );
    }
    if (query) {
      let products = [];
      let source = "none";
      try {
        products = await searchOff(query);
        if (products.length > 0) source = "open_food_facts";
      } catch {
        products = [];
      }
      if (products.length === 0) {
        return new Response(
          JSON.stringify({
            matched: false,
            source: "none",
            product: null,
            products,
            suggestion: "请用文字描述产品名称、配料与包装规格"
          }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" } }
        );
      }
      return new Response(
        JSON.stringify({ matched: true, source, product: products[0], products, factor_candidates: [] }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" } }
      );
    }
    const local = await localByCategory(env, category);
    if (local.length === 0) {
      return new Response(
        JSON.stringify({
          matched: false,
          source: "local_snapshot",
          product: null,
          products: [],
          suggestion: "本地快照无该品类产品；请用文字描述产品名称、配料与包装规格"
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" } }
      );
    }
    return new Response(
      JSON.stringify({ matched: true, source: "local_snapshot", product: local[0], products: local, factor_candidates: [] }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "upstream error";
    return errorResponse("UPSTREAM_ERROR", message);
  }
});
