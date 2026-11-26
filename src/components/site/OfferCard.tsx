import Link from "next/link";
import { ka } from "@/i18n/ka";
import type { PublicOffer } from "@/lib/public";
import { OfferFace, offerCardClass } from "@/components/panel/OfferFace";

/** Offer/request card that links to the offer page (search, company profile, related offers). */
export function OfferCard({ offer }: { offer: PublicOffer }) {
  return (
    <Link href={`/offers/${offer.id}`} className={offerCardClass}>
      <OfferFace
        offer={offer}
        badge={offer.type === "REQUEST" ? <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink">{ka.offer.typeRequest}</span> : null}
      />
    </Link>
  );
}
