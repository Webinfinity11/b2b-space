"use client";

import Link from "next/link";
import { ka } from "@/i18n/ka";
import { respondToOfferAction } from "@/actions/offers";
import type { PublicOffer } from "@/lib/public";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { ActionForm, Field, SubmitButton, Textarea } from "@/components/ui/Form";
import { perkOf, publisherName } from "./OfferFace";

/** Offer details with the "start negotiation" form — used by the popup and by the offers side panel. */
export function OfferDetails({ offer, respondAs, ownSlug, onClose }: { offer: PublicOffer; respondAs: string; ownSlug?: string; onClose: () => void }) {
  const logo = offer.publisher.kind === "company" ? offer.publisher.logoUrl : null;
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element -- uploads served from /files
            <img src={logo} alt={publisherName(offer)} className="mb-3 h-14 w-[170px] rounded-[12px] border border-line bg-white object-contain p-1.5" />
          )}
          <div className="text-xs text-muted">{offer.category?.name ?? ka.offer.notSpecified}</div>
          <h2 id="offer-details-title" className="mt-1 text-xl font-semibold text-ink">{offer.title}</h2>
          <div className="mt-1 text-sm font-semibold text-muted">
            {offer.publisher.kind === "company" ? (
              <Link href={`/companies/${offer.publisher.slug}`} className="hover:underline">{offer.publisher.name}</Link>
            ) : (
              publisherName(offer)
            )}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label={ka.sgba.close} className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted hover:bg-chip hover:text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-[12px] bg-blue-soft px-4 py-3">
        <span className="text-sm text-secondary">{ka.brandShort} {ka.sgba.specialCondition}</span>
        <span className="text-right text-lg font-bold text-accent">{perkOf(offer)}</span>
      </div>

      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-secondary">{offer.description}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[12px] border border-line p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted"><Icon name="users" size={14} /> {ka.sgba.forWhom}</div>
          <div className="mt-1 text-sm font-medium">{offer.audience || ka.offer.notSpecified}</div>
        </div>
        <div className="rounded-[12px] border border-line p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted"><Icon name="invoice" size={14} /> {ka.brandShort} {ka.sgba.commission}</div>
          <div className="mt-1 text-sm font-medium">{offer.commissionText || (offer.commissionPct ? `${offer.commissionPct}%` : ka.sgba.commissionFixed)}</div>
        </div>
      </div>
      <p className="mt-3 rounded-[10px] bg-[#fdf3dc] px-3 py-2 text-xs text-[#8a5a10]">{ka.sgba.commissionNote}</p>

      {offer.publisher.kind === "company" && offer.publisher.slug === ownSlug ? (
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{ka.sgba.close}</Button>
          <span className="inline-flex h-10 items-center rounded-full bg-chip px-4 text-sm text-muted">{ka.sgba.ownOffer}</span>
        </div>
      ) : (
        <ActionForm key={offer.id} action={respondToOfferAction} className="mt-5 space-y-3">
          <input type="hidden" name="offerId" value={offer.id} />
          <input type="hidden" name="respondAs" value={respondAs} />
          <Field label={ka.offer.message} name="message">
            <Textarea name="message" rows={3} placeholder={ka.sgba.startDealPlaceholder} required minLength={10} />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>{ka.sgba.close}</Button>
            <SubmitButton>
              <Icon name="arrow" size={15} /> {ka.sgba.startDeal}
            </SubmitButton>
          </div>
        </ActionForm>
      )}
    </>
  );
}
