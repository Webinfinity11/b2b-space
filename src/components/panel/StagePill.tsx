import { ka } from "@/i18n/ka";

const TONE: Record<string, string> = {
  INTEREST: "bg-chip text-secondary",
  OFFER: "bg-blue-soft text-accent",
  NEGOTIATION: "bg-[#efe9f8] text-[#6b46a3]",
  MEETING: "bg-[#fdf3dc] text-[#b7791f]",
  CONTRACT: "bg-[#e3f4ec] text-[#20815d]",
};

/** Deal stage pill: ინტერესი → შეთავაზება → მოლაპარაკება → შეხვედრა → კონტრაქტი. */
export function StagePill({ stage }: { stage: string }) {
  return <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE[stage] ?? TONE.INTEREST}`}>{ka.sgba.stages[stage] ?? stage}</span>;
}
