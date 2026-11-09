import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { requireUser } from "@/lib/authz";
import { param } from "@/lib/params";
import { getCategoryTree } from "@/lib/public";
import { actingIdentities } from "@/lib/publishers";
import { PageHeader } from "@/components/ui/Card";
import { OfferForm } from "@/components/panel/OfferForm";

export const metadata: Metadata = { title: ka.offerForm.newOffer };

export default async function NewOfferPage({ searchParams }: PageProps<"/company/offers/new">) {
  const type = param((await searchParams).type) === "REQUEST" ? "REQUEST" : "OFFER";
  const user = await requireUser("/company/offers/new");
  const [categories, publishAs] = await Promise.all([getCategoryTree(), actingIdentities(user.id, "offers.manage")]);
  return (
    <>
      <PageHeader
        title={type === "REQUEST" ? ka.offerForm.newRequest : ka.offerForm.newOffer}
        text={type === "REQUEST" ? ka.offerForm.requestsText : ka.offerForm.offersText}
      />
      <OfferForm defaults={{ type, isAnonymous: false }} categories={categories} publishAs={publishAs} />
    </>
  );
}
