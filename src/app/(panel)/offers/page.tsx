import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { db } from "@/lib/db";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { pageParam, param } from "@/lib/params";
import { getPopularCategories, searchOffers } from "@/lib/public";
import { companyIndustryIds } from "@/lib/sectors";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { OfferFilters } from "@/components/panel/OfferFilters";
import { Pagination } from "@/components/ui/Pagination";
import { OfferBoard, type OfferSection } from "@/components/panel/OfferBoard";

export const metadata: Metadata = { title: ka.sgba.perksTitle };

export default async function OffersPage({ searchParams }: PageProps<"/offers">) {
  const user = await requireUser("/offers");
  const m = await getActiveMembership(user.id);
  const sp = await searchParams;
  const q = param(sp.q);
  const category = param(sp.category);
  const badge = param(sp.badge);
  const type = param(sp.type) === "REQUEST" ? ("REQUEST" as const) : ("OFFER" as const);
  const page = pageParam(sp.page);
  const sort = param(sp.sort) === "validUntil" ? ("validUntil" as const) : undefined;
  // Default view: what fits my company's sector; "scope=all" is the general catalog.
  const industries = m ? await companyIndustryIds(m.companyId) : [];
  const forMe = industries.length > 0 && param(sp.scope) !== "all" && !badge;
  const scope = forMe ? undefined : industries.length > 0 ? "all" : undefined;
  // Programme badges (e.g. "ქალები ქმნიან ბიზნესს"): own tab, and the featured one gets its own section on top.
  const badges = await db.offerBadge.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const featured = badges.find((b) => b.showBanner) ?? null;
  const activeBadge = badges.find((b) => b.id === badge) ?? null;
  const showFeatured = !!featured && !badge && !q && !category && !sort && page === 1 && type === "OFFER";
  const [result, categories, featuredResult] = await Promise.all([
    searchOffers({ q, category, badge, type, sort, page, pageSize: 16, loggedIn: true, forIndustries: forMe ? industries : undefined, excludeOwn: { userId: user.id, companyId: m?.companyId }, notBadge: showFeatured ? featured!.id : undefined }),
    getPopularCategories(12, "OFFER"),
    showFeatured ? searchOffers({ badge: featured!.id, type: "OFFER", page: 1, pageSize: 4, loggedIn: true, excludeOwn: { userId: user.id, companyId: m?.companyId } }) : null,
  ]);

  const filtered = !!(q || category || badge || sort || type === "REQUEST");

  const href = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, category, badge, scope, sort, type: type === "REQUEST" ? "REQUEST" : undefined, ...extra })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/offers?${s}` : "/offers";
  };
  const pill = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-4 py-1.5 text-[13px] transition-colors ${active ? "border-ink bg-ink font-semibold text-surface" : "border-line bg-surface text-secondary hover:border-ink/40 hover:text-ink"}`;

  const featuredItems = featuredResult?.items ?? [];
  const sections: OfferSection[] = [
    ...(featured && featuredItems.length > 0 ? [{ title: featured.name, href: href({ badge: featured.id, page: undefined }), offers: featuredItems }] : []),
    ...(result.items.length > 0 ? [{ title: featuredItems.length > 0 ? ka.sgba.perksTitle : undefined, offers: result.items }] : []),
  ];

  return (
    <>
      <h1 className="sr-only">{type === "REQUEST" ? ka.sgba.requests : ka.sgba.perksTitle}</h1>
      <OfferFilters
        q={q}
        category={category}
        categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
        scope={industries.length > 0 ? [{ value: "", label: ka.sectors.filterForMe }, { value: "all", label: ka.sectors.filterAll }] : undefined}
        scopeValue={scope}
        sort={sort}
        badge={badge}
        type={type === "REQUEST" ? "REQUEST" : undefined}
        clearHref={filtered ? href({ q: undefined, category: undefined, badge: undefined, sort: undefined, type: undefined }) : undefined}
        total={result.total + (featuredResult?.total ?? 0)}
        pills={
          <>
            <Link href={href({ type: undefined, badge: undefined })} className={pill(type === "OFFER" && !badge)}>{ka.sgba.all}</Link>
            {badges.map((b) => (
              <Link key={b.id} href={href({ badge: b.id, type: undefined })} className={pill(badge === b.id)}>{b.name}</Link>
            ))}
            <Link href={href({ type: "REQUEST", badge: undefined })} className={pill(type === "REQUEST" && !badge)}>{ka.sgba.requests}</Link>
          </>
        }
        action={
          <ButtonLink href={`/company/offers/new?type=${type}`}>
            <Icon name="plus" size={16} /> {type === "REQUEST" ? ka.sgba.createRequest : ka.sgba.addOffer}
          </ButtonLink>
        }
      />

      <OfferBoard
        key={href({ page: String(page) })}
        sections={sections}
        respondAs={m?.companyId ?? "personal"}
        ownSlug={m?.company.slug}
        footer={<Pagination page={result.page} pages={result.pages} basePath="/offers" params={{ q, category, badge, scope, sort, type: type === "REQUEST" ? "REQUEST" : undefined }} />}
      >
        {activeBadge?.description && <p className="mb-4 max-w-2xl rounded-[16px] bg-surface-2 px-5 py-4 text-sm leading-relaxed text-secondary">{activeBadge.description}</p>}

        {sections.length === 0 && (
          <div className="rounded-[17px] border border-dashed border-line-strong px-4 py-14 text-center text-sm text-muted">
            <p>{ka.sgba.noOffers}</p>
            {forMe && (
              <Link href={href({ scope: "all" })} className="mt-3 inline-block font-bold text-accent hover:text-accent-hover">{ka.sgba.searchEverywhere}</Link>
            )}
          </div>
        )}
      </OfferBoard>
    </>
  );
}
