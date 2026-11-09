import Link from "next/link";
import { ka } from "@/i18n/ka";
import { formatDate } from "@/lib/format";
import { offerPriceLabel } from "@/lib/offer-format";
import type { PublicOffer } from "@/lib/public";
import { Icon } from "@/components/ui/Icon";

/** Offer/request card in the workspace "deal card" style. */
export function OfferCard({ offer }: { offer: PublicOffer }) {
  const isRequest = offer.type === "REQUEST";
  const publisher = offer.publisher.kind === "anonymous" ? ka.offer.anonymous : offer.publisher.name;
  return (
    <Link
      href={`/offers/${offer.id}`}
      className="group flex h-full gap-3.5 rounded-card border border-line bg-white/[0.012] p-3 transition-colors hover:border-accent/30 hover:bg-accent/[0.04]"
    >
      <div
        aria-hidden="true"
        className={`grid w-[84px] shrink-0 place-items-center rounded-[10px] ring-1 ring-inset ${
          isRequest ? "bg-warning/10 text-warning ring-warning/15" : "bg-accent/10 text-accent ring-accent/15"
        }`}
      >
        <Icon name={isRequest ? "search" : "box"} size={28} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="truncate text-[11px] text-muted">{publisher}</div>
        <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight">{offer.title}</h3>
        <div className="mt-0.5 truncate text-xs text-secondary">
          {[offer.category?.name, isRequest ? ka.offer.typeRequest : ka.offer.typeOffer].filter(Boolean).join(" · ")}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[11px] text-muted">
            <Icon name="arrowUp" size={12} />
            {offer.validUntil ? formatDate(offer.validUntil) : offer.city ?? ka.offer.notSpecified}
          </span>
          <span className="truncate text-sm font-bold tabular-nums">{offerPriceLabel(offer)}</span>
        </div>
      </div>
    </Link>
  );
}
