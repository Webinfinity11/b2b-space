/** Helpers for KPI sparklines and activity charts: daily buckets + change vs. the previous period. */
export const DAY = 86400000;

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Local midnight `n - 1` days ago, i.e. the first day of an n-day window ending today. */
export function windowStart(n: number) {
  const d = new Date(Date.now() - (n - 1) * DAY);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysFrom(start: Date, n: number) {
  return Array.from({ length: n }, (_, i) => new Date(start.getTime() + i * DAY));
}

export const dayLabel = (d: Date) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;

/** One value per day starting at `start` (counts, or sums when `v` is given). */
export function bucket(rows: { at: Date | null; v?: number }[], start: Date, n: number) {
  const map = new Map<string, number>();
  for (const r of rows) if (r.at) map.set(dayKey(r.at), (map.get(dayKey(r.at)) ?? 0) + (r.v ?? 1));
  return daysFrom(start, n).map((d) => map.get(dayKey(d)) ?? 0);
}

/** `all` = 60 daily values: last 30 for the sparkline, % change vs. the 30 before. */
export function trendOf(all: number[]) {
  const cur = all.slice(30).reduce((a, b) => a + b, 0);
  const prev = all.slice(0, 30).reduce((a, b) => a + b, 0);
  // No prior activity → no meaningful percentage.
  const pct = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
  return { spark: all.slice(30), pct };
}

export type Trend = ReturnType<typeof trendOf>;
