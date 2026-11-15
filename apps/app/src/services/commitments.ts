/**
 * Commitment records. Local-first: persisted on-device, mirrored to the backend
 * only when configured and reachable. No guilt marketing: cancel is always open.
 */
import { readJSON, writeJSON } from "./storage";
import { saveCommitmentBackend } from "./api";
import type { CommitmentRecord } from "../types/chat";

const KEY = "commitments";

const FOLLOW_UP_DAYS = 7;

/** Normalize a free-text commitment field for loose semantic comparison. */
export function normalizeCommitmentText(value?: string | null): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Two commitments are equivalent when they share the same `categoryId` and at
 * least one loose-normalized content field matches (text OR alternative).
 * Cancelled records never match: the same promise may be re-made after cancel.
 */
export function isEquivalentCommitment(
  input: { text: string; categoryId: string; alternative: string },
  record: CommitmentRecord,
): boolean {
  if (record.status !== "active") return false;
  if (record.categoryId !== input.categoryId) return false;
  const textMatch =
    normalizeCommitmentText(record.text) === normalizeCommitmentText(input.text);
  const alternativeMatch =
    normalizeCommitmentText(record.alternative) ===
    normalizeCommitmentText(input.alternative);
  return textMatch || alternativeMatch;
}

function dueDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function loadCommitments(): Promise<CommitmentRecord[]> {
  const list = await readJSON<CommitmentRecord[]>(KEY, []);
  return Array.isArray(list) ? list : [];
}

export async function addCommitment(input: {
  text: string;
  categoryId: string;
  alternative: string;
  barrier?: string | null;
  plan?: string | null;
}): Promise<CommitmentRecord> {
  const existing = await loadCommitments();
  const duplicate = existing.find((record) => isEquivalentCommitment(input, record));
  if (duplicate) {
    // Same active promise already exists: do not mirror to the backend again
    // and do not write a second record; return the existing one as-is.
    return duplicate;
  }
  const remote = await saveCommitmentBackend({ ...input, followUpDays: FOLLOW_UP_DAYS });
  const record: CommitmentRecord = {
    id: remote?.id ?? `local_${Date.now().toString(36)}`,
    text: input.text,
    categoryId: input.categoryId,
    alternative: input.alternative,
    barrier: input.barrier ?? null,
    plan: input.plan ?? null,
    createdAt: new Date().toISOString(),
    followUpDue: dueDate(FOLLOW_UP_DAYS),
    status: "active",
    source: remote ? "backend" : "local",
  };
  await writeJSON(KEY, [record, ...existing]);
  return record;
}

export async function cancelCommitment(id: string): Promise<CommitmentRecord[]> {
  const existing = await loadCommitments();
  const next = existing.map((r) => (r.id === id ? { ...r, status: "cancelled" as const } : r));
  await writeJSON(KEY, next);
  return next;
}
