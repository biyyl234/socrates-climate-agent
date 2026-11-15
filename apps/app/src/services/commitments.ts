/**
 * Commitment records. Local-first: persisted on-device, mirrored to the backend
 * only when configured and reachable. No guilt marketing: cancel is always open.
 */
import { readJSON, writeJSON } from "./storage";
import { saveCommitmentBackend } from "./api";
import type { CommitmentRecord } from "../types/chat";

const KEY = "commitments";

const FOLLOW_UP_DAYS = 7;

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
