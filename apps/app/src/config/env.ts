/**
 * Public runtime configuration. Safe values only; secrets live on the backend.
 * Unset backend/avatar config falls back to the built-in offline demo data and
 * the L4 (text-only) avatar level, so the app runs with no account or network.
 *
 * Each EXPO_PUBLIC_* value is read through a direct, static property access so
 * babel-preset-expo can inline it at build time. A dynamic process.env[name]
 * helper would defeat that inlining and return empty on the web runtime shim.
 */

function clean(value: string | undefined): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

export const env = {
  /** Supabase project URL used as the backend base. Empty = offline demo mode. */
  supabaseUrl: clean(process.env.EXPO_PUBLIC_SUPABASE_URL),
  /** Public anon/publishable key attached to backend requests. */
  publishableKey: clean(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  /** Standalone avatar bundle URL (iframe on web, WebView on native). */
  avatarUrl: clean(process.env.EXPO_PUBLIC_AVATAR_URL),
  /** Locale hint sent to the avatar and backend. */
  locale: clean(process.env.EXPO_PUBLIC_LOCALE) || "zh-CN",
} as const;

export const backendConfigured: boolean = env.supabaseUrl.length > 0;

export const ENDPOINTS = {
  chat: "/functions/v1/chat",
  tts: "/functions/v1/tts",
  models: "/functions/v1/models",
  product: "/functions/v1/product",
  lca: "/functions/v1/lca",
  compare: "/functions/v1/compare",
  commitment: "/functions/v1/commitment",
} as const;

export function backendUrl(path: string): string {
  const base = env.supabaseUrl.replace(/\/+$/, "");
  return `${base}${path}`;
}
