import { ka } from "@/i18n/ka";

export type HeroData = {
  /** Verified companies joined per day, last 30 days (oldest first). */
  companiesPerDay: number[];
  /** Offers published per week, last 6 weeks (oldest first). */
  offersPerWeek: number[];
};


/**
 * Banner artwork for the featured programme: colourful silk ribbons and three glass cards
 * driven by real platform data (company growth, weekly offers, users). Never cropped.
 */
export function HeroArt({ data }: { data: HeroData }) {
  // Company growth: running total over 30 days, min–max scaled so even small growth is visible.
  const run = data.companiesPerDay.reduce<number[]>((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], []);
  const lo = Math.min(...run);
  const hi = Math.max(...run);
  const W = 160;
  const H = 52;
  const pts = run.map((v, i) => [(i / Math.max(1, run.length - 1)) * W, H - 6 - (hi === lo ? 0.35 : (v - lo) / (hi - lo)) * (H - 14)] as const);
  let line = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = ((pts[i - 1][0] + pts[i][0]) / 2).toFixed(1);
    line += ` C${cx} ${pts[i - 1][1].toFixed(1)} ${cx} ${pts[i][1].toFixed(1)} ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  const newCompanies = data.companiesPerDay.reduce((a, b) => a + b, 0);
  const newOffers = data.offersPerWeek.reduce((a, b) => a + b, 0);
  const barMax = Math.max(1, ...data.offersPerWeek);

  return (
    <>
      <svg viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 size-full">
        <defs>
          <linearGradient id="hero-base" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#0a1650" />
            <stop offset="0.55" stopColor="#12308f" />
            <stop offset="1" stopColor="#1d45d1" />
          </linearGradient>
          <radialGradient id="hero-glow" cx="0.82" cy="0.05" r="0.5">
            <stop offset="0" stopColor="#8fb0ff" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hero-glow-pink" cx="0.96" cy="0.92" r="0.42">
            <stop offset="0" stopColor="#ff7eb6" stopOpacity="0.30" />
            <stop offset="1" stopColor="#ff7eb6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hero-glow-teal" cx="0.62" cy="0.02" r="0.34">
            <stop offset="0" stopColor="#3ee0c4" stopOpacity="0.22" />
            <stop offset="1" stopColor="#3ee0c4" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hero-glow-amber" cx="0.78" cy="1.05" r="0.3">
            <stop offset="0" stopColor="#ffc46b" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ffc46b" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hero-r1" x1="0" x2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#9a86ff" stopOpacity="0.28" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="hero-r2" x1="0" x2="1">
            <stop offset="0" stopColor="#7fe9ff" stopOpacity="0" />
            <stop offset="0.6" stopColor="#5fd6ff" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ff8fc4" stopOpacity="0.20" />
          </linearGradient>
          <linearGradient id="hero-r3" x1="0" x2="1">
            <stop offset="0" stopColor="#0d246f" stopOpacity="0" />
            <stop offset="0.7" stopColor="#0d246f" stopOpacity="0.20" />
            <stop offset="1" stopColor="#0d246f" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <rect width="1200" height="300" fill="url(#hero-base)" />
        <rect width="1200" height="300" fill="url(#hero-glow)" />
        <rect width="1200" height="300" fill="url(#hero-glow-teal)" />
        <rect width="1200" height="300" fill="url(#hero-glow-pink)" />
        <rect width="1200" height="300" fill="url(#hero-glow-amber)" />
        <path d="M380 300 C 520 220 640 270 760 190 S 1000 90 1200 120 L1200 300 Z" fill="url(#hero-r3)" />
        <path d="M300 300 C 460 190 600 240 740 150 S 990 40 1200 70 L1200 150 C 1000 120 880 190 740 230 S 470 300 300 300 Z" fill="url(#hero-r1)" />
        <path d="M520 300 C 640 230 760 250 860 170 S 1050 70 1200 40 L1200 90 C 1060 120 960 200 850 250 S 640 310 520 300 Z" fill="url(#hero-r2)" />
        <path d="M360 262 C 520 170 650 230 790 140 S 1030 30 1200 56" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.2" />
      </svg>

      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-[46%] lg:block">
        {/* new companies, last 30 days */}
        <div className="absolute right-[36%] top-[18%] w-[210px] rounded-[14px] border border-white/15 bg-[#050d33]/70 p-3.5 shadow-[0_22px_44px_-14px_rgb(2_6_30/0.8)] backdrop-blur-md">
          <div className="text-[11px] font-semibold text-white/80">{ka.admin.stats.companies}</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[22px] font-extrabold leading-none tracking-tight text-white">+{newCompanies}</span>
            <span className="text-[10.5px] font-medium text-white/65">30 დღეში</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full overflow-visible" fill="none">
            <defs>
              <linearGradient id="hero-card-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#5eead4" stopOpacity="0.20" />
                <stop offset="1" stopColor="#5eead4" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="spark-area" d={`${line} L${W} ${H} L0 ${H} Z`} fill="url(#hero-card-fill)" />
            <path className="spark-line" pathLength={1} d={line} stroke="#5eead4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <circle className="spark-pulse" cx={lx} cy={ly} r="3.6" fill="#5eead4" />
            <circle cx={lx} cy={ly} r="3" fill="#0a1650" stroke="#5eead4" strokeWidth="1.6" />
          </svg>
        </div>

        {/* offers published per week */}
        <div className="absolute right-[4%] top-[34%] w-[170px] rounded-[14px] border border-white/15 bg-[#050d33]/70 p-3.5 shadow-[0_22px_44px_-14px_rgb(2_6_30/0.8)] backdrop-blur-md">
          <div className="text-[11px] font-semibold text-white/80">{ka.admin.stats.activeOffers}</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[22px] font-extrabold leading-none tracking-tight text-white">{newOffers}</span>
            <span className="text-[10.5px] font-medium text-white/65">6 კვირაში</span>
          </div>
          <div className="mt-2.5 flex h-[44px] items-end gap-1.5">
            {data.offersPerWeek.map((v, i) => (
              <span
                key={i}
                className="hero-bar flex-1 rounded-t-[4px]"
                style={{ height: `${Math.max(10, (v / barMax) * 100)}%`, animationDelay: `${i * 90}ms`, background: i === data.offersPerWeek.length - 1 ? "#a78bfa" : "rgba(255,255,255,0.22)" }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
