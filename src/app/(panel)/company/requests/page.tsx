import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { OfferList } from "@/components/panel/OfferList";

export const metadata: Metadata = { title: ka.panel.myRequests };

export default function MyRequestsPage() {
  return <OfferList type="REQUEST" />;
}
