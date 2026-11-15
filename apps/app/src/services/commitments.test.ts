/**
 * Deterministic tests for commitment de-duplication. Storage and backend are
 * stubbed in-memory; no AsyncStorage/fetch is touched.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommitmentRecord } from "../types/chat";

const { store, backendSpy } = vi.hoisted(() => {
  const store = new Map<string, unknown>();
  let n = 0;
  return {
    store,
    backendSpy: vi.fn(async () => ({ id: `remote_${++n}` })),
  };
});

vi.mock("./storage", () => ({
  readJSON: vi.fn(async (key: string, fallback: unknown) =>
    store.has(key) ? store.get(key) : fallback,
  ),
  writeJSON: vi.fn(async (key: string, value: unknown) => {
    store.set(key, value);
  }),
}));

vi.mock("./api", () => ({
  saveCommitmentBackend: backendSpy,
}));

import {
  addCommitment,
  cancelCommitment,
  isEquivalentCommitment,
  normalizeCommitmentText,
} from "./commitments";

function makeRecord(
  over: Partial<CommitmentRecord> & { text: string; categoryId: string; alternative: string },
): CommitmentRecord {
  return {
    id: `local_${Math.random().toString(36).slice(2)}`,
    barrier: null,
    plan: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    followUpDue: null,
    status: "active",
    source: "local",
    ...over,
  };
}

const VEG = {
  text: "下一餐选一次素食窗口",
  categoryId: "beef",
  alternative: "自选素菜套餐",
};

describe("normalizeCommitmentText", () => {
  it("trims, collapses internal whitespace and lowercases", () => {
    expect(normalizeCommitmentText("  下一餐   选一次\t素食窗口 ")).toBe("下一餐 选一次 素食窗口");
    expect(normalizeCommitmentText("HELLO   World")).toBe("hello world");
  });

  it("treats null/undefined as empty", () => {
    expect(normalizeCommitmentText(null)).toBe("");
    expect(normalizeCommitmentText(undefined)).toBe("");
  });
});

describe("isEquivalentCommitment", () => {
  it("matches same category with loosely normalized text", () => {
    const existing = makeRecord({ ...VEG });
    expect(
      isEquivalentCommitment(
        { ...VEG, text: "  下一餐选一次素食窗口  ", alternative: "其他替代" },
        existing,
      ),
    ).toBe(true);
  });

  it("matches on alternative alone within the same category", () => {
    const existing = makeRecord({ ...VEG, text: "另一条措辞" });
    expect(
      isEquivalentCommitment(
        { text: "别的文本", categoryId: VEG.categoryId, alternative: "自选素菜套餐" },
        existing,
      ),
    ).toBe(true);
  });

  it("does not match across categories", () => {
    const existing = makeRecord({ ...VEG });
    expect(
      isEquivalentCommitment({ ...VEG, categoryId: "water" }, existing),
    ).toBe(false);
  });

  it("ignores cancelled records even when wording matches", () => {
    const cancelled = makeRecord({ ...VEG, status: "cancelled" });
    expect(isEquivalentCommitment(VEG, cancelled)).toBe(false);
  });
});

describe("addCommitment de-duplication", () => {
  beforeEach(() => {
    store.clear();
    backendSpy.mockClear();
  });

  it("a repeated equivalent promise reuses the existing record, no second write/backend call", async () => {
    const first = await addCommitment(VEG);
    const again = await addCommitment({
      ...VEG,
      text: "  下一餐选一次素食窗口  ",
      alternative: "自选素菜套餐",
    });

    const list = (store.get("commitments") as CommitmentRecord[]) ?? [];
    expect(list).toHaveLength(1);
    expect(again.id).toBe(first.id);
    expect(backendSpy).toHaveBeenCalledTimes(1);
  });

  it("still creates separate records for different promises", async () => {
    await addCommitment(VEG);
    await addCommitment({
      text: "这瓶水换成自带水杯",
      categoryId: "water",
      alternative: "自带保温杯",
    });

    const list = (store.get("commitments") as CommitmentRecord[]) ?? [];
    expect(list).toHaveLength(2);
    expect(backendSpy).toHaveBeenCalledTimes(2);
  });

  it("allows re-adding the same promise after it was cancelled", async () => {
    const first = await addCommitment(VEG);
    await cancelCommitment(first.id);
    const readded = await addCommitment(VEG);

    const list = (store.get("commitments") as CommitmentRecord[]) ?? [];
    expect(list).toHaveLength(2);
    expect(readded.id).not.toBe(first.id);
    expect(list.find((r) => r.id === first.id)?.status).toBe("cancelled");
    expect(list.find((r) => r.id === readded.id)?.status).toBe("active");
    expect(backendSpy).toHaveBeenCalledTimes(2);
  });
});
