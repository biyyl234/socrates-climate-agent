/**
 * Thin Supabase REST helper. Edge functions run with the service role injected
 * by the platform; reference tables are publicly readable and personal tables
 * are written server-side under RLS bypass (see migration 0001_init.sql).
 */

export interface RestEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export class RestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RestError";
  }
}

function requireConfigured(env: RestEnv): { url: string; key: string } {
  const url = env.SUPABASE_URL?.replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new RestError(500, "INTERNAL", "Supabase environment is not configured");
  }
  return { url, key };
}

export async function restSelect<T = unknown[]>(
  env: RestEnv,
  table: string,
  query: string,
): Promise<T> {
  const { url, key } = requireConfigured(env);
  const endpoint = `${url}/rest/v1/${table}?${query}`;
  const response = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new RestError(response.status, "UPSTREAM_ERROR", `REST select ${table} failed (HTTP ${response.status})`);
  }
  return (await response.json()) as T;
}

export async function restInsert<T = Record<string, unknown>>(
  env: RestEnv,
  table: string,
  record: Record<string, unknown>,
): Promise<T> {
  const { url, key } = requireConfigured(env);
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(record),
  });
  if (!response.ok) {
    throw new RestError(response.status, "UPSTREAM_ERROR", `REST insert ${table} failed (HTTP ${response.status})`);
  }
  const rows = (await response.json()) as T[];
  return rows[0] as T;
}
