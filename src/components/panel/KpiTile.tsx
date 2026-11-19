import { Icon, type IconName } from "@/components/ui/Icon";
import { Sparkline } from "@/components/panel/Sparkline";
import type { Trend } from "@/lib/trend";

export type Tone = "blue" | "green" | "violet" | "amber" | "pink";
/** Per-tile accent: icon chip tint + line colour. */
const TONES: Record<Tone, { color: string; chip: string }> = {
  blue: { color: "#1d45d1", chip: "bg-[#e6edff] text-[#1d45d1]" },
  green: { color: "#12a572", chip: "bg-[#dcf6ea] text-[#0e8a5f]" },
  violet: { color: "#7a56e8", chip: "bg-[#ece6ff] text-[#6a45d8]" },
  amber: { color: "#e8920f", chip: "bg-[#fff0d4] text-[#c77700]" },
  pink: { color: "#e5518f", chip: "bg-[#ffe3ef] text-[#d03a79]" },
};

/** Metric tile: icon chip + label, big value, change vs. previous 30 days, sparkline. */
export function KpiTile({ id, label, value, hint, icon, t, tone = "blue", className = "" }: { id: string; label: string; value: string | number; hint?: string; icon: IconName; t: Trend; tone?: Tone; className?: string }) {
  return (
    <div className={`relative min-h-[112px] rounded-[13px] border border-line bg-surface p-3.5 ${className}`}>
      <div className="flex items-center gap-2.5 text-xs font-bold text-ink">
        <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${TONES[tone].chip}`}>
          <Icon name={icon} size={15} />
        </span>
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <div className="mt-2.5 truncate text-[22px] font-extrabold leading-none tracking-[-0.5px] text-ink tabular-nums">{value}</div>
      {t.pct !== null && (
        <div className={`mt-1.5 text-[11px] font-semibold tabular-nums ${t.pct > 0 ? "text-success" : t.pct < 0 ? "text-danger" : "text-muted"}`}>
          {t.pct > 0 ? "↑" : t.pct < 0 ? "↓" : "→"} {Math.abs(t.pct)}%
        </div>
      )}
      {hint && <div className="mt-0.5 truncate text-[11px] text-muted">{hint}</div>}
      <Sparkline id={`spark-${id}`} values={t.spark} color={TONES[tone].color} muted={t.spark.every((v) => v === 0)} />
    </div>
  );
}
