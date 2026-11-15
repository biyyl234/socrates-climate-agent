/**
 * LLM model discovery and selection.
 *
 * The model list is fetched from the backend /models Edge Function, which
 * proxies the provider's GET /models server-side; the API key is never
 * exposed to the client. The user's chosen model is persisted locally and
 * sent to /chat via the X-LLM-Model header (the model id is not a secret).
 * When no override is selected, the server uses its environment default.
 */
import { backendUrl, ENDPOINTS, env } from "../config/env";
import { readString, writeString } from "./storage";

export interface ModelOption {
  id: string;
  owned_by?: string;
}

export interface ModelCatalog {
  models: ModelOption[];
  defaultModel: string;
  profileId: string;
  baseUrl: string;
}

const SELECTED_KEY = "selected_llm_model";
let selectedModel: string | null = null;

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (env.publishableKey) {
    headers.apikey = env.publishableKey;
    headers.Authorization = `Bearer ${env.publishableKey}`;
  }
  return headers;
}

/** Fetch the available model catalog through the backend proxy. */
export async function fetchModelCatalog(): Promise<ModelCatalog> {
  let response: Response;
  try {
    response = await fetch(backendUrl(ENDPOINTS.models), {
      method: "GET",
      headers: authHeaders(),
    });
  } catch (cause) {
    throw new Error(cause instanceof Error ? `拉取模型列表失败：${cause.message}` : "拉取模型列表失败");
  }
  if (!response.ok) {
    throw new Error(`拉取模型列表失败：后端返回 ${response.status}`);
  }
  const payload = (await response.json()) as {
    models?: ModelOption[];
    default_model?: string;
    profile_id?: string;
    base_url?: string;
  };
  return {
    models: Array.isArray(payload.models) ? payload.models : [],
    defaultModel: payload.default_model ?? "",
    profileId: payload.profile_id ?? "",
    baseUrl: payload.base_url ?? "",
  };
}

/** Load the persisted selection once (native async storage / web). */
export async function initSelectedModel(): Promise<string | null> {
  if (selectedModel === null) {
    selectedModel = await readString(SELECTED_KEY);
  }
  return selectedModel;
}

/** Persist the user's selected model. */
export async function setSelectedModel(modelId: string): Promise<void> {
  selectedModel = modelId;
  await writeString(SELECTED_KEY, modelId);
}

/** Clear the override so the server default applies. */
export async function clearSelectedModel(): Promise<void> {
  selectedModel = null;
  const { removeKey } = await import("./storage");
  await removeKey(SELECTED_KEY);
}

/**
 * Synchronous read for the request header. On web this reads localStorage
 * directly; on native it returns the value cached by initSelectedModel().
 */
export function getSelectedModelSync(): string | null {
  if (selectedModel) return selectedModel;
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      const v = globalThis.localStorage.getItem("socrates:" + SELECTED_KEY);
      if (v) selectedModel = v;
      return v;
    }
  } catch {
    /* storage unavailable */
  }
  return selectedModel;
}
