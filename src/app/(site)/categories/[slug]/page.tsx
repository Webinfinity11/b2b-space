import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ka } from "@/i18n/ka";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { pageParam } from "@/lib/params";
import { searchCompanies, searchOffers } from "@/lib/public";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { CatalogShell } from "@/components/site/CatalogShell";
import { CompanyCard } from "@/components/site/CompanyCard";
import { OfferCard } from "@/components/site/OfferCard";

async function load(slug: string) {
  return db.category.findFirst({
    where: { slug, isActive: true },
    select: {
      name: true,
      slug: true,
      parent: { select: { name: true, slug: true } },
      children: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { name: true, slug: true } },
    },
  });
}

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const c = await load((await params).slug);
  return c ? { title: c.name } : {};
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await load(slug);
  if (!category) notFound();
  const user = await getCurrentUser();
  const [companies, offers] = await Promise.all([
    searchCompanies({ category: slug, page: pageParam(sp.page) }),
    searchOffers({ category: slug, loggedIn: Boolean(user), page: 1 }),
  ]);

  return (
    <CatalogShell title={category.name} text={category.parent ? category.parent.name : ka.catalog.companiesText}>
      {category.children.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {category.children.map((c) => (
            <Link key={c.slug} href={`/categories/${c.slug}`}>
              <Badge tone="info">{c.name}</Badge>
            </Link>
          ))}
        </div>
      )}
      <h2 className="mb-4 text-lg font-semibold">
        {ka.nav.companies} <span className="text-sm font-normal text-muted">({companies.total})</span>
      </h2>
      {companies.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.items.map((c) => (
            <CompanyCard key={c.id} company={c} />
          ))}
        </div>
      ) : (
        <EmptyState text={ka.catalog.noCompanies} />
      )}
      <Pagination page={companies.page} pages={companies.pages} basePath={`/categories/${slug}`} params={{}} />
      {offers.items.length > 0 && (
        <>
          <div className="mb-4 mt-12 flex items-end justify-between">
            <h2 className="text-lg font-semibold">{ka.nav.offers}</h2>
            <Link href={`/offers?category=${slug}`} className="text-sm text-accent-strong hover:underline">
              {ka.home.viewAll} →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.items.slice(0, 6).map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        </>
      )}
    </CatalogShell>
  );
}
