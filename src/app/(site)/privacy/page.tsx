import type { Metadata } from "next";
import { ka } from "@/i18n/ka";

export const metadata: Metadata = { title: ka.legal.privacyTitle };

export default function Page() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-[28px] font-semibold tracking-tight">{ka.legal.privacyTitle}<span className="text-accent">.</span></h1>
      <p className="mt-6 rounded-card border border-line bg-card p-6 text-sm leading-relaxed text-muted shadow-card">{ka.legal.pending}</p>
    </div>
  );
}
