import type { Metadata } from "next";
import { ka } from "@/i18n/ka";

export const metadata: Metadata = { title: ka.legal.termsTitle };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold">{ka.legal.termsTitle}</h1>
      <p className="mt-6 rounded-card border border-line bg-surface p-6 text-sm leading-relaxed text-muted shadow-card">{ka.legal.pending}</p>
    </div>
  );
}
