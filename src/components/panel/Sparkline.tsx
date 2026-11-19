/**
 * Small activity line for KPI tiles (server-rendered; the motion is pure CSS).
 * Daily values are smoothed with a short moving average so the line undulates like real activity.
 */
export function Sparkline({ values, muted = false, id, color: tone }: { values: number[]; muted?: boolean; id: string; color?: string }) {
  const W = 96;
  const H = 36;
  // Gaussian smoothing (sigma ~2.2 days): a rounded hump instead of a boxy plateau.
  const K = Array.from({ length: 13 }, (_, k) => Math.exp(-((k - 6) ** 2) / (2 * 2.2 ** 2)));
  const sm = values.map((_, i) => {
    let num = 0;
    let den = 0;
    for (let k = 0; k < K.length; k++) {
      const j = i + k - 6;
      if (j < 0 || j >= values.length) continue;
      num += values[j] * K[k];
      den += K[k];
    }
    return num / den;
  });
  const max = Math.max(1, ...sm);
  const n = sm.length;
  const P = sm.map((v, i) => [(i / Math.max(1, n - 1)) * W, H - 4 - (v / max) * (H - 12)] as const);
  let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const [x0, y0] = P[i - 1];
    const [x1, y1] = P[i];
    const cx = ((x0 + x1) / 2).toFixed(1);
    d += ` C${cx} ${y0.toFixed(1)} ${cx} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  const color = muted ? "var(--color-line-strong)" : (tone ?? "var(--color-accent)");
  const [lx, ly] = P[n - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute right-3.5 top-[44px] overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.30" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="spark-area" d={`${d} L${W} ${H} L0 ${H} Z`} fill={`url(#${id})`} />
      <path className="spark-line" pathLength={1} d={d} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      {!muted && (
        <>
          <circle className="spark-pulse" cx={lx} cy={ly} r="3.5" fill={color} />
          <circle cx={lx} cy={ly} r="2.4" fill="var(--color-surface)" stroke={color} strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}
