/** Number/interval formatting helpers. Intervals are always shown, never a bare point value. */

export function fmtValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(3).replace(/\.?0+$/, "");
}

export function fmtInterval(interval: [number, number], unit: string): string {
  return `约 ${fmtValue(interval[0])} – ${fmtValue(interval[1])} ${unit}`;
}

export function fmtPercent(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}
