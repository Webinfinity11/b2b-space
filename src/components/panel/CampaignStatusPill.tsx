import { ka } from "@/i18n/ka";

const TONE: Record<string, string> = {
  NEW: "bg-blue-soft text-accent",
  IN_PROGRESS: "bg-[#efe9f8] text-[#6b46a3]",
  APPROVED: "bg-[#fdf3dc] text-[#b7791f]",
  RUNNING: "bg-[#e3f4ec] text-[#20815d]",
  DONE: "bg-chip text-secondary",
  REJECTED: "bg-[#fde8e8] text-[#c53030]",
};

export function CampaignStatusPill({ status }: { status: string }) {
  return <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE[status] ?? TONE.NEW}`}>{ka.sgba.campStatus[status] ?? status}</span>;
}
