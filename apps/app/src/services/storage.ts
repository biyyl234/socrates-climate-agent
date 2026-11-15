/**
 * Persistence adapter. Native uses AsyncStorage; web falls back to localStorage.
 * All keys are namespaced under `socrates:`.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "socrates:";

function webStorage(): Storage | null {
  if (typeof globalThis !== "undefined" && typeof globalThis.localStorage !== "undefined") {
    return globalThis.localStorage;
  }
  return null;
}

export async function readString(key: string): Promise<string | null> {
  const storage = webStorage();
  if (storage) {
    try {
      return storage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  }
  try {
    return await AsyncStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export async function writeString(key: string, value: string): Promise<void> {
  const storage = webStorage();
  if (storage) {
    try {
      storage.setItem(PREFIX + key, value);
    } catch {
      /* storage unavailable: ignore */
    }
    return;
  }
  try {
    await AsyncStorage.setItem(PREFIX + key, value);
  } catch {
    /* storage unavailable: ignore */
  }
}

export async function removeKey(key: string): Promise<void> {
  const storage = webStorage();
  if (storage) {
    try {
      storage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await readString(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJSON<T>(key: string, value: T): Promise<void> {
  await writeString(key, JSON.stringify(value));
}
