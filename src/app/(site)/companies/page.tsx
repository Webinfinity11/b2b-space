import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { getCategoryTree, getCompanyCities, searchCompanies } from "@/lib/public";
import { pageParam, param } from "@/lib/params";
import { EmptyState } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { CatalogFilters } from "@/components/site/CatalogFilters";
import { CompanyCard } from "@/components/site/CompanyCard";
import { CatalogShell } from "@/components/site/CatalogShell";

export const metadata: Metadata = { title: ka.catalog.companiesTitle };

export default async function CompaniesPage({ searchParams }: PageProps<"/companies">) {
  const sp = await searchParams;
  const values = {
    q: param(sp.q),
    category: param(sp.category),
    country: param(sp.country, 8),
    city: param(sp.city),
    verified: param(sp.verified) === "1" ? "1" : undefined,
    sort: param(sp.sort) === "name" ? "name" : undefined,
  };
  const page = pageParam(sp.page);
  const [result, categories, cities] = await Promise.all([
    searchCompanies({ ...values, verified: values.verified === "1", sort: values.sort as "name" | undefined, page }),
    getCategoryTree(),
    getCompanyCities(),
  ]);

  return (
    <CatalogShell title={ka.catalog.companiesTitle} text={ka.catalog.companiesText}>
      <CatalogFilters
        action="/companies"
        values={values}
        categories={categories}
        cities={cities}
        verifiedFilter
        sortOptions={[
          { value: "", label: ka.catalog.sortNewest },
          { value: "name", label: ka.catalog.sortName },
        ]}
      />
      <p className="mb-4 mt-6 text-sm text-muted">{ka.catalog.results(result.total)}</p>
      {result.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((c) => <CompanyCard key={c.id} company={c} />)}
        </div>
      ) : (
        <EmptyState text={ka.catalog.noCompanies} />
      )}
      <Pagination page={result.page} pages={result.pages} basePath="/companies" params={values} />
    </CatalogShell>
  );
}
