import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { getCurrentUser } from "@/lib/session";
import { pageParam, param } from "@/lib/params";
import { getCategoryTree, getOfferCities, searchOffers } from "@/lib/public";
import { EmptyState } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { CatalogFilters } from "@/components/site/CatalogFilters";
import { CatalogShell } from "@/components/site/CatalogShell";
import { OfferCard } from "@/components/site/OfferCard";

export const metadata: Metadata = { title: ka.catalog.offersTitle };

export default async function OffersPage({ searchParams }: PageProps<"/offers">) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const t = param(sp.type);
  const type = t === "OFFER" || t === "REQUEST" ? (t as "OFFER" | "REQUEST") : undefined;
  const sort = param(sp.sort) === "validUntil" ? ("validUntil" as const) : undefined;
  const values = { q: param(sp.q), category: param(sp.category), city: param(sp.city), type, sort };
  const [result, categories, cities] = await Promise.all([
    searchOffers({ ...values, page: pageParam(sp.page), loggedIn: Boolean(user) }),
    getCategoryTree(),
    getOfferCities(),
  ]);
  return (
    <CatalogShell title={ka.catalog.offersTitle} text={ka.catalog.offersText}>
      <CatalogFilters
        action="/offers"
        values={values}
        categories={categories}
        cities={cities}
        typeFilter
        sortOptions={[
          { value: "", label: ka.catalog.sortNewest },
          { value: "validUntil", label: ka.catalog.sortValidUntil },
        ]}
      />
      <p className="mb-4 mt-6 text-sm text-muted">{ka.catalog.results(result.total)}</p>
      {result.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((o) => (
            <OfferCard key={o.id} offer={o} />
          ))}
        </div>
      ) : (
        <EmptyState text={ka.catalog.noOffers} />
      )}
      <Pagination page={result.page} pages={result.pages} basePath="/offers" params={values} />
    </CatalogShell>
  );
}
