import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { OfferList } from "@/components/panel/OfferList";

export const metadata: Metadata = { title: ka.panel.myRequests };

export default async function MyRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const archived = (await searchParams).archived === "1";
  return <OfferList type="REQUEST" archived={archived} />;
}
