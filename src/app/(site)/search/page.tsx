import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { param } from "@/lib/params";
import { globalSearch } from "@/lib/public";
import { getCurrentUser } from "@/lib/session";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Card";
import { HeaderSearch } from "@/components/ui/HeaderSearch";
import { CatalogShell } from "@/components/site/CatalogShell";
import { CompanyCard } from "@/components/site/CompanyCard";
import { OfferCard } from "@/components/site/OfferCard";

export const metadata: Metadata = { title: ka.search.pageTitle };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const q = param((await searchParams).q) ?? "";
  const user = await getCurrentUser();
  const r = q.length >= 2 ? await globalSearch(q, Boolean(user), 24) : null;
  const total = r ? r.companies.length + r.offers.length + r.categories.length : 0;

  return (
    <CatalogShell title={ka.search.pageTitle} text={q ? ka.search.pageText(q) : ka.search.pageEmpty} tiles={[3, 5, 6]}>
      {/* On phones the header search is hidden — offer it here */}
      <div className="mb-6 md:hidden">
        <HeaderSearch defaultValue={q} />
      </div>
      {!r ? (
        <EmptyState text={q ? ka.search.minChars : ka.search.pageEmpty} />
      ) : total === 0 ? (
        <EmptyState text={ka.search.none} />
      ) : (
        <div className="space-y-10">
          {r.categories.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">{ka.search.categories}</h2>
              <div className="flex flex-wrap gap-2">
                {r.categories.map((c) => (
                  <Link key={c.slug} href={`/categories/${c.slug}`}>
                    <Badge tone="info">{c.parent ? `${c.parent} · ${c.name}` : c.name}</Badge>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {r.companies.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">
                {ka.search.companies} <span className="text-sm font-normal text-muted">({r.companies.length})</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {r.companies.map((c) => (
                  <CompanyCard key={c.id} company={c} />
                ))}
              </div>
            </section>
          )}
          {r.offers.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">
                {ka.search.offers} <span className="text-sm font-normal text-muted">({r.offers.length})</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {r.offers.map((o) => (
                  <OfferCard key={o.id} offer={o} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </CatalogShell>
  );
}
