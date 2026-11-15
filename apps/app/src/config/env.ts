/**
 * Public runtime configuration. Safe values only; secrets live on the backend.
 * Unset backend/avatar config falls back to the built-in offline demo data and
 * the L4 (text-only) avatar level, so the app runs with no account or network.
 */

function readPublic(name: string): string {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

export const env = {
  /** Supabase project URL used as the backend base. Empty = offline demo mode. */
  supabaseUrl: readPublic("EXPO_PUBLIC_SUPABASE_URL"),
  /** Public anon/publishable key attached to backend requests. */
  publishableKey: readPublic("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  /** Standalone avatar bundle URL (iframe on web, WebView on native). */
  avatarUrl: readPublic("EXPO_PUBLIC_AVATAR_URL"),
  /** Locale hint sent to the avatar and backend. */
  locale: readPublic("EXPO_PUBLIC_LOCALE") || "zh-CN",
} as const;

export const backendConfigured: boolean = env.supabaseUrl.length > 0;

export const ENDPOINTS = {
  chat: "/functions/v1/chat",
  tts: "/functions/v1/tts",
  product: "/functions/v1/product",
  lca: "/functions/v1/lca",
  compare: "/functions/v1/compare",
  commitment: "/functions/v1/commitment",
} as const;

export function backendUrl(path: string): string {
  const base = env.supabaseUrl.replace(/\/+$/, "");
  return `${base}${path}`;
}
