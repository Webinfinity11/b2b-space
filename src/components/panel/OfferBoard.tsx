"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ka } from "@/i18n/ka";
import type { PublicOffer } from "@/lib/public";
import { Icon } from "@/components/ui/Icon";
import { OfferDetails } from "./OfferDetails";
import { OfferTile } from "./OfferGrid";

export type OfferSection = { title?: string; href?: string; offers: PublicOffer[] };

/**
 * Offers page layout: cards across the page; choosing one opens its details in a right-hand column
 * instead of a popup (on small screens they cover the screen).
 */
export function OfferBoard({ sections, respondAs, ownSlug, children, footer }: { sections: OfferSection[]; respondAs: string; ownSlug?: string; children: ReactNode; footer?: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = sections.flatMap((s) => s.offers).find((o) => o.id === openId) ?? null;
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);

  return (
    <div className={`grid items-start gap-4 ${open ? "lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,1fr)]" : ""}`}>
      <section className="min-w-0 rounded-[28px] bg-surface p-4 sm:p-5">
        {children}
        {sections.map((s, i) => (
          <div key={s.title ?? i} className={i > 0 ? "mt-8" : ""}>
            {s.title && (
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-ink">{s.title}</h2>
                {s.href && (
                  <Link href={s.href} className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-bold text-accent hover:text-accent-hover">
                    {ka.sgba.viewAll} <Icon name="arrow" size={15} />
                  </Link>
                )}
              </div>
            )}
            <div className={`grid gap-3 sm:grid-cols-2 ${open ? "" : "lg:grid-cols-3"}`}>
              {s.offers.map((o) => (
                <OfferTile key={o.id} offer={o} selected={o.id === openId} onOpen={() => setOpenId(o.id)} />
              ))}
            </div>
          </div>
        ))}
        {footer}
      </section>

      {open && (
        <aside role="region" aria-labelledby="offer-details-title" className="fixed inset-0 z-50 overflow-y-auto bg-surface p-6 lg:sticky lg:inset-auto lg:top-4 lg:z-10 lg:max-h-[calc(100dvh-32px)] lg:rounded-[28px]">
          <OfferDetails offer={open} respondAs={respondAs} ownSlug={ownSlug} onClose={() => setOpenId(null)} />
        </aside>
      )}
    </div>
  );
}
