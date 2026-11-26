import type { ReactNode } from "react";
import { ka } from "@/i18n/ka";
import { offerPriceLabel } from "@/lib/offer-format";
import type { PublicOffer } from "@/lib/public";

export const publisherName = (o: PublicOffer) => (o.publisher.kind === "anonymous" ? ka.offer.anonymous : o.publisher.name);

/** Special condition: the perk, or the price when no perk was set. */
export const perkOf = (o: PublicOffer) => o.perk || offerPriceLabel(o);

const initials = (name: string) => name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase();

/** Compact card: small logo + company, title, condition and an arrow under a dashed line. */
export function OfferFace({ offer: o, badge }: { offer: PublicOffer; badge?: ReactNode }) {
  const logo = o.publisher.kind === "company" ? o.publisher.logoUrl : null;
  const meta = [o.category?.name ?? (o.type === "REQUEST" ? ka.offer.typeRequest : ka.offer.typeOffer), o.city].filter(Boolean).join(" · ");
  return (
    <>
      <div className="flex items-center gap-2.5">
        <span className="grid h-12 w-[62px] shrink-0 place-items-center overflow-hidden rounded-[12px] border border-line bg-white p-1">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- company logo
            <img src={logo} alt="" className="h-full min-h-0 w-full rounded-[6px] object-contain" />
          ) : (
            <span className="text-sm font-extrabold text-[#1d45d1]">{initials(publisherName(o))}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-secondary">{publisherName(o)}</div>
          <div className="truncate text-[11.5px] text-muted">{meta}</div>
        </div>
      </div>
      {badge && <div className="mt-2.5 flex">{badge}</div>}
      <h3 className="mb-3 mt-3 line-clamp-2 text-[15px] font-bold leading-[1.45] text-ink">{o.title}</h3>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-dashed border-line-strong pt-3">
        <span className="min-w-0 truncate text-xl font-extrabold leading-[1.4] tracking-[-0.3px] text-ink">{perkOf(o)}</span>
        <span aria-hidden="true" className="grid size-[34px] shrink-0 place-items-center rounded-full bg-blue-soft text-accent transition-colors group-hover:bg-ink group-hover:text-surface">
          →
        </span>
      </div>
    </>
  );
}

export const offerCardClass =
  "group relative flex h-full min-w-0 flex-col rounded-[20px] border-[1.5px] border-line bg-surface p-4 text-left transition hover:border-ink hover:shadow-[0_14px_30px_-20px_rgb(11_18_37/0.45)]";
