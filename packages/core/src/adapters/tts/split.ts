/**
 * Sentence-level text splitting shared by all TTS adapters. Long utterances are
 * split on sentence boundaries first; any over-long chunk is hard-split at
 * `maxChars` so the upstream engine never receives an oversized request.
 */

const SENTENCE_SPLIT_RE = /[^。！？!?；;\n]+[。！？!?；;]?/g;

export function splitBySentence(text: string, maxChars = 200): string[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  const sentences = trimmed.match(SENTENCE_SPLIT_RE) ?? [trimmed];
  const chunks: string[] = [];

  for (const sentence of sentences) {
    const clean = sentence.trim();
    if (clean.length === 0) continue;
    if (clean.length <= maxChars) {
      chunks.push(clean);
      continue;
    }
    for (let i = 0; i < clean.length; i += maxChars) {
      chunks.push(clean.slice(i, i + maxChars));
    }
  }
  return chunks;
}
