import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { OfferList } from "@/components/panel/OfferList";

export const metadata: Metadata = { title: ka.panel.myOffers };

export default function MyOffersPage() {
  return <OfferList type="OFFER" />;
}
