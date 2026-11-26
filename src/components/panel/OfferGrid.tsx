"use client";

import { useEffect, useState } from "react";
import { ka } from "@/i18n/ka";
import type { PublicOffer } from "@/lib/public";

import { BADGE_STYLE } from "./badge-style";
import { OfferDetails } from "./OfferDetails";
import { OfferFace, offerCardClass } from "./OfferFace";

/** One selectable card; `onOpen` decides whether details show in a popup or in a side panel. */
export function OfferTile({ offer: o, selected = false, onOpen }: { offer: PublicOffer; selected?: boolean; onOpen: () => void }) {
  return (
    <article className={`${offerCardClass} ${selected ? "border-ink!" : ""}`}>
      <OfferFace
        offer={o}
        badge={
          o.badge?.isActive ? (
            <span className={`max-w-full truncate rounded-full px-2.5 py-1 text-[11px] font-semibold ${BADGE_STYLE[o.badge.color] ?? BADGE_STYLE.blue}`}>{o.badge.name}</span>
          ) : o.type === "REQUEST" ? (
            <span className="rounded-full bg-chip px-2.5 py-1 text-[11px] font-semibold text-ink">{ka.offer.typeRequest}</span>
          ) : null
        }
      />
      <button type="button" onClick={onOpen} aria-pressed={selected} aria-label={`${ka.sgba.details}: ${o.title}`} className="absolute inset-0 rounded-[20px]" />
    </article>
  );
}

/**
 * Offer cards with a details popup that can open a negotiation right away.
 * `respondAs` is the active company id (or "personal"); `ownSlug` hides the action on own offers.
 */
export function OfferGrid({ offers, respondAs, ownSlug, cols = 4 }: { offers: PublicOffer[]; respondAs: string; ownSlug?: string; cols?: 3 | 4 }) {
  const [open, setOpen] = useState<PublicOffer | null>(null);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
      <div className={`grid gap-3 sm:grid-cols-2 ${cols === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        {offers.map((o) => (
          <OfferTile key={o.id} offer={o} onOpen={() => setOpen(o)} />
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="offer-details-title">
          <button type="button" aria-label={ka.sgba.close} onClick={() => setOpen(null)} className="absolute inset-0 bg-[rgb(11_18_37/0.45)] backdrop-blur-sm" />
          <div className="relative max-h-[90dvh] w-full max-w-[560px] overflow-y-auto rounded-[16px] bg-surface p-6 shadow-2xl">
            <OfferDetails offer={open} respondAs={respondAs} ownSlug={ownSlug} onClose={() => setOpen(null)} />
          </div>
        </div>
      )}
    </>
  );
}
