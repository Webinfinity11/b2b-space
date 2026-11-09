/** First string value of a search param, trimmed and length-limited. */
export function param(v: string | string[] | undefined, max = 100): string | undefined {
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s.slice(0, max) : undefined;
}

export function pageParam(v: string | string[] | undefined): number {
  const n = Number.parseInt(param(v) ?? "1", 10);
  return Number.isFinite(n) && n > 0 && n < 10_000 ? n : 1;
}
