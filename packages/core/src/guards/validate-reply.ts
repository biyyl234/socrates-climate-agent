/**
 * LLM reply guard (report §7.1–§7.4). Maintains the per-turn authorized numeric
 * set sourced only from deterministic tool results, then checks the outgoing
 * text against:
 *
 *  - unauthorized emission numbers        → UNAUTHORIZED_NUMBER
 *  - links outside the registered source   → UNREGISTERED_URL (stripped)
 *  - factor claim without a citation       → MISSING_CITATION
 *  - missing low-confidence hedge wording  → LOW_CONFIDENCE_MISSING_WORDING
 *  - sensitive / out-of-scope topic       → GUARDED_TOPIC
 *
 * On UNAUTHORIZED_NUMBER / MISSING_CITATION the orchestrator regenerates once;
 * a second failure degrades the reply to a neutral datacard-mount message.
 */

import { domainOf, isRegisteredSourceUrl } from "./source-whitelist";
import { classifySensitive, type GuardTopicCategory, type SensitiveHit } from "./sensitive";

export const NUMBER_PATTERN = /\d+(?:\.\d+)?\s*(?:kgCO2e|gCO2e|kg CO2e)/g;
export const URL_PATTERN = /https?:\/\/[^\s，。）)]+/g;

export type GuardTag =
  | "UNAUTHORIZED_NUMBER"
  | "UNREGISTERED_URL"
  | "MISSING_CITATION"
  | "LOW_CONFIDENCE_MISSING_WORDING"
  | "GUARDED_TOPIC";

export interface GuardIssue {
  tag: GuardTag;
  detail: string;
  category?: GuardTopicCategory;
}

/** Values authorized by this turn's tool results. */
export interface AuthorizedValueSet {
  numbers: number[];
  sourceUrls: string[];
}

export interface LowConfidenceContext {
  lowConfidence?: boolean;
  dq?: "A" | "B" | "C" | "D" | "E";
  geographyWeak?: boolean;
  temporalWeak?: boolean;
}

export interface GuardContext {
  lowConfidence?: LowConfidenceContext;
}

export interface GuardReport {
  issues: GuardIssue[];
  /** Hard sensitive topic hit → route to GUARDED. */
  blocked: boolean;
  /** Regenerate once against the same tool results. */
  needsRegeneration: boolean;
  /** Second failure: reply replaced by the neutral datacard message. */
  degraded: boolean;
  strippedUrls: string[];
}

const FACTOR_CLAIM_PATTERNS: RegExp[] = [
  /\d+(?:\.\d+)?\s*(?:kg|g|斤|千克|克)\s*[\s\S]{0,12}(?:≈|=|排放|碳足迹|因子)/,
  /排放因子/,
  /每\s*(?:kg|千克|g|克)\s*.{0,20}(?:≈|=|碳|排放)/,
];

const HEDGE_PHRASES = [
  "粗略参考",
  "仅供方向参考",
  "其他地区",
  "代表性不足",
  "方向参考",
  "估算",
  "粗略",
];

/** Neutral replacement after the second guard failure (report §7.4). */
export const DEGRADED_NEUTRAL_TEXT =
  "数据已挂载到信息卡，我们基于已核对的区间聊聊可以尝试的小改变。";

// ---------------------------------------------------------------------------
// Authorized set construction
// ---------------------------------------------------------------------------

function collectNumbers(value: unknown, sink: Set<number>): void {
  if (value === null || value === undefined) return;
  if (typeof value === "number") {
    if (Number.isFinite(value)) sink.add(value);
    return;
  }
  if (typeof value === "string") return;
  if (Array.isArray(value)) {
    for (const item of value) collectNumbers(item, sink);
    return;
  }
  if (typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectNumbers(nested, sink);
    }
  }
}

function collectSourceUrls(value: unknown, sink: Set<string>): void {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value)) sink.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectSourceUrls(item, sink);
    return;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.source_url === "string") sink.add(record.source_url);
    for (const nested of Object.values(record)) collectSourceUrls(nested, sink);
  }
}

export function buildAuthorizedFromToolResults(results: unknown[]): AuthorizedValueSet {
  const numbers = new Set<number>();
  const sourceUrls = new Set<string>();
  for (const result of results) {
    collectNumbers(result, numbers);
    collectSourceUrls(result, sourceUrls);
  }
  return { numbers: [...numbers], sourceUrls: [...sourceUrls] };
}

function matchesAuthorized(token: string, authorized: AuthorizedValueSet): boolean {
  const numeric = token.match(/(\d+(?:\.\d+)?)/);
  if (!numeric) return false;
  const value = Number(numeric[1]);
  return authorized.numbers.some((allowed) => Math.abs(allowed - value) <= 1e-6);
}

function hasFactorClaim(text: string): boolean {
  return FACTOR_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

function hasAttachedSource(text: string): boolean {
  if (/数据[:：]/.test(text)) return true;
  if (/来源/.test(text)) return true;
  const urls = text.match(URL_PATTERN) ?? [];
  return urls.some((url) => isRegisteredSourceUrl(url));
}

function isWeakConfidence(context?: LowConfidenceContext): boolean {
  if (!context) return false;
  const weakDq = context.dq === "C" || context.dq === "D" || context.dq === "E";
  return Boolean(
    context.lowConfidence || weakDq || context.geographyWeak || context.temporalWeak,
  );
}

// ---------------------------------------------------------------------------
// URL stripping
// ---------------------------------------------------------------------------

export function stripUnregisteredUrls(text: string): { text: string; stripped: string[] } {
  const stripped: string[] = [];
  const cleaned = text.replace(URL_PATTERN, (url) => {
    if (isRegisteredSourceUrl(url)) return url;
    stripped.push(url);
    return "";
  });
  return { text: cleaned.replace(/\s{2,}/g, " ").trim(), stripped };
}

// ---------------------------------------------------------------------------
// Main validation
// ---------------------------------------------------------------------------

export function validateReply(text: string, authorized: AuthorizedValueSet, context?: GuardContext): GuardReport {
  const issues: GuardIssue[] = [];
  const strippedUrls: string[] = [];
  let blocked = false;

  // 1. Authorized numbers
  const numberTokens = text.match(NUMBER_PATTERN) ?? [];
  for (const token of numberTokens) {
    if (!matchesAuthorized(token, authorized)) {
      issues.push({ tag: "UNAUTHORIZED_NUMBER", detail: `unauthorized emission number: ${token}` });
    }
  }

  // 2. Registered-source URLs
  const urls = text.match(URL_PATTERN) ?? [];
  for (const url of urls) {
    if (!isRegisteredSourceUrl(url)) {
      issues.push({ tag: "UNREGISTERED_URL", detail: `domain ${domainOf(url)} not registered` });
      strippedUrls.push(url);
    }
  }

  // 3. Factor claim must carry a source
  if (hasFactorClaim(text) && !hasAttachedSource(text)) {
    issues.push({
      tag: "MISSING_CITATION",
      detail: "emission factor claim has no attached source citation",
    });
  }

  // 4. Low-confidence hedge wording
  const weak = isWeakConfidence(context?.lowConfidence);
  if (weak && !HEDGE_PHRASES.some((phrase) => text.includes(phrase))) {
    issues.push({
      tag: "LOW_CONFIDENCE_MISSING_WORDING",
      detail: "weak confidence / DQ result lacks an explicit hedge phrase",
    });
  }

  // 5. Sensitive topics
  const sensitive: SensitiveHit[] = classifySensitive(text);
  for (const hit of sensitive) {
    issues.push({
      tag: "GUARDED_TOPIC",
      detail: `sensitive topic "${hit.matched}" (${hit.category})`,
      category: hit.category,
    });
    if (hit.hard) blocked = true;
  }

  const needsRegeneration = issues.some(
    (issue) => issue.tag === "UNAUTHORIZED_NUMBER" || issue.tag === "MISSING_CITATION",
  );

  return { issues, blocked, needsRegeneration, degraded: false, strippedUrls };
}

/** After a second failure, mark the report degraded and return the neutral text. */
export function markDegraded(report: GuardReport): GuardReport {
  return { ...report, degraded: true };
}

/** First-attempt policy: regenerate once; any later attempt degrades instead. */
export function nextGuardAction(attempt: number, report: GuardReport): "allow" | "regenerate" | "degrade" {
  if (!report.blocked && !report.needsRegeneration) return "allow";
  if (report.blocked) return "degrade";
  return attempt < 1 ? "regenerate" : "degrade";
}
