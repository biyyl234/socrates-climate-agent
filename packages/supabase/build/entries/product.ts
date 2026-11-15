/**
 * POST/GET /product — product & barcode lookup (report §3.5).
 *
 * Open Food Facts is proxied through this function with a canonical User-Agent;
 * the local products snapshot (public read via RLS) is the offline fallback.
 * Emission factors are never looked up here — that stays with the local factor
 * library in @socrates/data.
 */

import {
  CORS_HEADERS,
  envObject,
  errorResponse,
  preflightResponse,
  readJsonBody,
} from "../shared/http";
import { restSelect, type RestEnv } from "../shared/rest";

const OFF_BASE = "https://world.openfoodfacts.org";
const OFF_UA = "SocratesCampusLab/0.1 (educational demo; campus consumption lab)";

interface NormalizedProduct {
  barcode: string | null;
  name: string | null;
  brands: string[];
  categories: string[];
  ingredients: string[];
  image_url: string | null;
  quantity: string | null;
  serving_size: string | null;
  off_source_url: string | null;
  data_quality: {
    has_nutrition_data: boolean;
    verified: boolean;
    missing_fields: string[];
  };
}

function splitList(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeOffProduct(p: Record<string, unknown>): NormalizedProduct {
  const name = typeof p.product_name === "string" && p.product_name.trim() ? p.product_name : null;
  const brands = Array.isArray(p.brands_tags)
    ? (p.brands_tags as string[])
    : splitList(p.brands);
  const categories = Array.isArray(p.categories_tags)
    ? (p.categories_tags as string[])
    : splitList(p.categories);
  const ingredients = Array.isArray(p.ingredients_tags)
    ? (p.ingredients_tags as string[])
    : splitList(p.ingredients_text);
  const barcode = typeof p.code === "string" ? p.code : null;
  const imageUrl =
    (typeof p.image_front_url === "string" ? p.image_front_url : null) ??
    (typeof p.image_url === "string" ? p.image_url : null);
  const missing: string[] = [];
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
      missing_fields: missing,
    },
  };
}

function normalizeLocalProduct(row: Record<string, unknown>): NormalizedProduct {
  return {
    barcode: typeof row.barcode === "string" ? row.barcode : null,
    name: typeof row.name === "string" ? row.name : null,
    brands: Array.isArray(row.brands) ? (row.brands as string[]) : [],
    categories: Array.isArray(row.categories) ? (row.categories as string[]) : [],
    ingredients: Array.isArray(row.ingredients) ? (row.ingredients as string[]) : [],
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    quantity: typeof row.quantity === "string" ? row.quantity : null,
    serving_size: typeof row.serving_size === "string" ? row.serving_size : null,
    off_source_url: null,
    data_quality: {
      has_nutrition_data: false,
      verified: false,
      missing_fields: [],
    },
  };
}

async function fetchOff(barcode: string): Promise<NormalizedProduct | null> {
  const endpoint = `${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const response = await fetch(endpoint, { headers: { "User-Agent": OFF_UA } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`OFF barcode lookup failed (HTTP ${response.status})`);
  const payload = (await response.json()) as {
    status?: number;
    product?: Record<string, unknown>;
  };
  if (payload.status !== 1 || !payload.product) return null;
  return normalizeOffProduct(payload.product);
}

async function searchOff(query: string): Promise<NormalizedProduct[]> {
  const endpoint = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(
    query,
  )}&json=1&page_size=12&fields=code,product_name,brands_tags,categories_tags,ingredients_tags,image_front_url,quantity,serving_size,nutrition_grade_fr,checked`;
  const response = await fetch(endpoint, { headers: { "User-Agent": OFF_UA } });
  if (!response.ok) throw new Error(`OFF search failed (HTTP ${response.status})`);
  const payload = (await response.json()) as { products?: Record<string, unknown>[] };
  return (payload.products ?? []).map(normalizeOffProduct);
}

async function localByBarcode(env: RestEnv, barcode: string): Promise<NormalizedProduct | null> {
  const rows = await restSelect<Record<string, unknown>[]>(
    env,
    "products",
    `barcode=eq.${encodeURIComponent(barcode)}&select=*&limit=1`,
  );
  return rows[0] ? normalizeLocalProduct(rows[0]) : null;
}

async function localByCategory(env: RestEnv, category: string): Promise<NormalizedProduct[]> {
  const rows = await restSelect<Record<string, unknown>[]>(
    env,
    "products",
    `categories=cs.{${encodeURIComponent(category)}}&select=*&limit=12`,
  );
  return rows.map(normalizeLocalProduct);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "GET" && request.method !== "POST") {
    return errorResponse("INVALID_PAYLOAD", "Method not allowed; use GET or POST", [
      { field: "method", reason: "expected GET or POST" },
    ]);
  }

  const env = envObject();
  let barcode: string | undefined;
  let query: string | undefined;
  let category: string | undefined;

  if (request.method === "GET") {
    const url = new URL(request.url);
    barcode = url.searchParams.get("barcode") ?? undefined;
    query = url.searchParams.get("query") ?? undefined;
    category = url.searchParams.get("category") ?? undefined;
  } else {
    const body = await readJsonBody(request);
    if (!body.ok) return errorResponse("INVALID_PAYLOAD", "请求体不满足 schema", body.issues);
    const raw = body.value as { barcode?: string; query?: string; category?: string };
    barcode = raw.barcode;
    query = raw.query;
    category = raw.category;
  }

  if (!barcode && !query && !category) {
    return errorResponse("INVALID_PAYLOAD", "需要 barcode、query 或 category 之一", [
      { field: "query", reason: "one of barcode/query/category is required" },
    ]);
  }

  try {
    if (barcode) {
      let product: NormalizedProduct | null = null;
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
          { field: "barcode", reason: barcode },
        ]);
      }
      return new Response(
        JSON.stringify({ matched: true, source, product, factor_candidates: [] }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" } },
      );
    }

    if (query) {
      let products: NormalizedProduct[] = [];
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
            suggestion: "请用文字描述产品名称、配料与包装规格",
          }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" } },
        );
      }
      return new Response(
        JSON.stringify({ matched: true, source, product: products[0], products, factor_candidates: [] }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" } },
      );
    }

    const local = await localByCategory(env, category!);
    if (local.length === 0) {
      return new Response(
        JSON.stringify({
          matched: false,
          source: "local_snapshot",
          product: null,
          products: [],
          suggestion: "本地快照无该品类产品；请用文字描述产品名称、配料与包装规格",
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" } },
      );
    }
    return new Response(
      JSON.stringify({ matched: true, source: "local_snapshot", product: local[0], products: local, factor_candidates: [] }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "upstream error";
    return errorResponse("UPSTREAM_ERROR", message);
  }
});
