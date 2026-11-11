import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { getPublicSettings } from "@/lib/settings";

export const metadata: Metadata = { title: ka.legal.termsTitle };

/** Text is managed by the platform admin (/admin/settings). */
export default async function Page() {
  const text = (await getPublicSettings()).termsText;
  return (
    <div className="max-w-3xl">
      <h1 className="text-[28px] font-semibold tracking-tight">{ka.legal.termsTitle}<span className="text-accent">.</span></h1>
      <div className={`mt-6 whitespace-pre-line rounded-card border border-line bg-card p-6 text-sm leading-relaxed shadow-card ${text ? "text-ink" : "text-muted"}`}>{text || ka.legal.pending}</div>
    </div>
  );
}
