export type ChartSeries = { label: string; values: number[]; color: string };

/**
 * Cumulative multi-series area chart (server-rendered). Running totals keep the chart readable
 * even when activity is sparse: it always rises to the period total instead of showing one spike.
 */
export function ActivityChart({ days, series, empty, height = 190 }: { days: string[]; series: ChartSeries[]; empty: string; height?: number }) {
  const W = 600;
  const padT = 12;
  const padB = 4;
  const n = days.length;
  const cum = series.map((s) => s.values.map((_, i) => s.values.slice(0, i + 1).reduce((a, b) => a + b, 0)));
  const max = Math.max(1, ...cum.flat());
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (v: number) => padT + (1 - v / max) * (height - padT - padB);
  const path = (vs: number[]) => {
    let d = `M0 ${y(vs[0]).toFixed(1)}`;
    for (let i = 1; i < vs.length; i++) {
      const cx = ((x(i - 1) + x(i)) / 2).toFixed(1);
      d += ` C${cx} ${y(vs[i - 1]).toFixed(1)} ${cx} ${y(vs[i]).toFixed(1)} ${x(i).toFixed(1)} ${y(vs[i]).toFixed(1)}`;
    }
    return d;
  };
  const none = cum.every((c) => c.every((v) => v === 0));
  const gridVals = [max, Math.round(max / 2), 0];
  const ticks = [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        {series.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <i className="size-1.5 rounded-full" style={{ background: s.color }} />
            {s.label} <b className="font-semibold tabular-nums text-ink">{cum[i][n - 1]}</b>
          </span>
        ))}
      </div>
      <div className="relative pl-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-6 flex-col justify-between text-[10px] leading-none text-muted tabular-nums" style={{ height }}>
          {gridVals.map((g, i) => (
            <span key={i} style={{ marginTop: i === 0 ? padT - 5 : 0, marginBottom: i === 2 ? padB - 3 : 0 }}>{g}</span>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${height}`} className="w-full overflow-visible" style={{ height }} preserveAspectRatio="none" role="img" aria-label={series.map((s) => s.label).join(", ")}>
          {[0, 0.5, 1].map((t) => {
            const gy = padT + t * (height - padT - padB);
            return <line key={t} x1="0" x2={W} y1={gy} y2={gy} stroke="var(--color-line)" strokeWidth="1" strokeDasharray={t === 1 ? undefined : "3 4"} vectorEffect="non-scaling-stroke" />;
          })}
          {series.map((s, i) => (
            <g key={i}>
              {i === 0 && <path d={`${path(cum[i])} L${W} ${height - padB} L0 ${height - padB} Z`} fill={s.color} opacity="0.09" />}
              <path d={path(cum[i])} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        </svg>
        {none && <div className="absolute inset-0 grid place-items-center pl-6 text-xs text-muted">{empty}</div>}
        <div className="mt-1.5 flex justify-between text-[11px] text-muted">
          {ticks.map((t, i) => <span key={i}>{days[t]}</span>)}
        </div>
      </div>
    </div>
  );
}
