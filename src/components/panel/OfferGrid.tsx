"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ka } from "@/i18n/ka";
import { respondToOfferAction } from "@/actions/offers";
import type { PublicOffer } from "@/lib/public";
import { offerPriceLabel } from "@/lib/offer-format";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { ActionForm, Field, SubmitButton, Textarea } from "@/components/ui/Form";

import { BADGE_STYLE } from "./badge-style";

/** Category → line icon (dashboard design). */
const CAT_ICON: Record<string, "car" | "bank" | "calendar" | "users" | "shield" | "box"> = {
  ავტო: "car",
  საწვავი: "car",
  ფინანსები: "bank",
  სასტუმროები: "calendar",
  HR: "users",
  დაზღვევა: "shield",
};

const initials = (name: string) => name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase();

function publisherName(o: PublicOffer) {
  return o.publisher.kind === "anonymous" ? ka.offer.anonymous : o.publisher.name;
}

/** Special condition shown in blue: the perk, or the price when no perk was set. */
function perkOf(o: PublicOffer) {
  return o.perk || offerPriceLabel(o);
}

/**
 * Special-offer cards (SGBA layout) with a details modal that can open a negotiation right away.
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
      <div className={`grid gap-4 sm:grid-cols-2 ${cols === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        {offers.map((o) => {
          const perk = perkOf(o);
          const big = /^[−-]?\d|%/.test(perk) && perk.length <= 8;
          return (
            <article key={o.id} className="flex min-w-0 flex-col rounded-card border border-line bg-surface px-[22px] pb-3.5 pt-[19px] transition hover:-translate-y-[3px] hover:border-accent/40 hover:shadow-[0_10px_28px_rgb(36_62_128/0.04)]">
              <div className="mb-3 flex min-h-9 items-center gap-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-blue-soft text-[17px] font-bold text-accent">
                  {CAT_ICON[o.category?.name ?? ""] ? <Icon name={CAT_ICON[o.category!.name]} size={22} /> : initials(publisherName(o))}
                </span>
                <span className="whitespace-nowrap text-xs text-muted">{o.category?.name ?? (o.type === "REQUEST" ? ka.offer.typeRequest : ka.offer.typeOffer)}</span>
                {o.badge?.isActive && <span className={`ml-auto max-w-[156px] truncate rounded-full px-2.5 py-1 text-[10px] ${BADGE_STYLE[o.badge.color] ?? BADGE_STYLE.blue}`}>{o.badge.name}</span>}
                {o.type === "REQUEST" && !o.badge?.isActive && <span className="ml-auto rounded-full bg-[#fff4dc] px-2.5 py-1 text-[10px] text-[#a06a12]">{ka.offer.typeRequest}</span>}
              </div>
              <h3 className="mb-1 text-base font-bold leading-[1.55] tracking-[-0.2px] text-ink">{o.title}</h3>
              <p className="mb-1.5 text-[13px] text-secondary">{publisherName(o)}</p>
              <p className="mb-4 line-clamp-3 flex-1 text-[13px] leading-[1.7] text-secondary">{o.description}</p>
              <div className="mt-auto flex min-h-11 items-center justify-between gap-2 border-t border-line pt-3 text-accent">
                <span className={`min-w-0 truncate font-bold ${big ? "text-[22px] tracking-[-0.5px]" : "text-[13px]"}`}>{perk}</span>
                <button type="button" onClick={() => setOpen(o)} className="inline-flex shrink-0 items-center gap-1.5 py-1 text-[11px] text-accent hover:text-accent-hover">
                  {ka.sgba.details} <Icon name="arrow" size={14} />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="offer-modal-title">
          <button type="button" aria-label={ka.sgba.close} onClick={() => setOpen(null)} className="absolute inset-0 bg-[rgb(11_18_37/0.45)] backdrop-blur-sm" />
          <div className="relative max-h-[90dvh] w-full max-w-[560px] overflow-y-auto rounded-[16px] bg-surface p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs text-muted">{open.category?.name ?? ka.offer.notSpecified}</div>
                <h2 id="offer-modal-title" className="mt-1 text-xl font-semibold text-ink">{open.title}</h2>
                <div className="mt-1 text-sm font-semibold text-muted">
                  {open.publisher.kind === "company" ? (
                    <Link href={`/companies/${open.publisher.slug}`} className="hover:underline">{open.publisher.name}</Link>
                  ) : (
                    publisherName(open)
                  )}
                </div>
              </div>
              <button type="button" onClick={() => setOpen(null)} aria-label={ka.sgba.close} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-chip hover:text-ink">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-[12px] bg-blue-soft px-4 py-3">
              <span className="text-sm text-secondary">{ka.brandShort} {ka.sgba.specialCondition}</span>
              <span className="text-right text-lg font-bold text-accent">{perkOf(open)}</span>
            </div>

            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-secondary">{open.description}</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[12px] border border-line p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted"><Icon name="users" size={14} /> {ka.sgba.forWhom}</div>
                <div className="mt-1 text-sm font-medium">{open.audience || ka.offer.notSpecified}</div>
              </div>
              <div className="rounded-[12px] border border-line p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted"><Icon name="invoice" size={14} /> {ka.brandShort} {ka.sgba.commission}</div>
                <div className="mt-1 text-sm font-medium">{open.commissionText || (open.commissionPct ? `${open.commissionPct}%` : ka.sgba.commissionFixed)}</div>
              </div>
            </div>
            <p className="mt-3 rounded-[10px] bg-[#fdf3dc] px-3 py-2 text-xs text-[#8a5a10]">{ka.sgba.commissionNote}</p>

            {open.publisher.kind === "company" && open.publisher.slug === ownSlug ? (
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setOpen(null)}>{ka.sgba.close}</Button>
                <span className="inline-flex h-10 items-center rounded-full bg-chip px-4 text-sm text-muted">{ka.sgba.ownOffer}</span>
              </div>
            ) : (
              <ActionForm action={respondToOfferAction} className="mt-5 space-y-3">
                <input type="hidden" name="offerId" value={open.id} />
                <input type="hidden" name="respondAs" value={respondAs} />
                <Field label={ka.offer.message} name="message">
                  <Textarea name="message" rows={3} placeholder={ka.sgba.startDealPlaceholder} required minLength={10} />
                </Field>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setOpen(null)}>{ka.sgba.close}</Button>
                  <SubmitButton>
                    <Icon name="arrow" size={15} /> {ka.sgba.startDeal}
                  </SubmitButton>
                </div>
              </ActionForm>
            )}
          </div>
        </div>
      )}
    </>
  );
}
