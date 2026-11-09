/* eslint-disable @next/next/no-img-element -- decorative design photos */
import type { ReactNode } from "react";
import { ka } from "@/i18n/ka";

/** Login / registration: form card on the left, the home-page photo gallery + steps on the right. */
export function AuthCard({ title, text, children, footer }: { title: string; text: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:items-start">
      <div>
        <div className="rounded-[18px] border border-line bg-card p-6 shadow-card sm:p-8">
          <h1 className="text-[26px] font-semibold tracking-tight">
            {title}
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-1 text-sm text-secondary">{text}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-5 text-center text-sm text-muted">{footer}</p>
      </div>

      <div className="relative hidden lg:block" aria-hidden="true">
        <div className="grid h-[460px] grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)] gap-3">
          <div className="min-h-0 overflow-hidden rounded-[18px] border border-line">
            <img src="/images/tile-0.jpg" alt="" className="h-full w-full object-cover" />
          </div>
          <div className="grid min-h-0 grid-rows-3 gap-3">
            {[2, 7, 8].map((i) => (
              <div key={i} className="min-h-0 overflow-hidden rounded-[14px] border border-line">
                <img src={`/images/tile-${i}.jpg`} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute -bottom-8 right-6 w-[280px] rotate-[-4deg] rounded-[18px] bg-white p-5 text-deep shadow-2xl">
          <div className="text-[15px] font-semibold">{ka.home.howItWorks}</div>
          <ol className="mt-3 space-y-2 text-[13px] text-[#334155]">
            {ka.home.steps.map((s, i) => (
              <li key={s.title} className="flex items-center gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-deep text-[10px] font-bold text-[#8EC5ED]">{i + 1}</span>
                {s.title}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
