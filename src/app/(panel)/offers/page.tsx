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
import { PageHeader } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { OfferGrid } from "@/components/panel/OfferGrid";

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
  // Default view: what fits my company's sector; "scope=all" is the general catalog.
  const industries = m ? await companyIndustryIds(m.companyId) : [];
  const forMe = industries.length > 0 && param(sp.scope) !== "all" && !badge;
  const scope = forMe ? undefined : industries.length > 0 ? "all" : undefined;
  // Programme badges (e.g. "ქალები ქმნიან ბიზნესს"): own tab, and the featured one gets its own section on top.
  const badges = await db.offerBadge.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const featured = badges.find((b) => b.showBanner) ?? null;
  const activeBadge = badges.find((b) => b.id === badge) ?? null;
  const showFeatured = !!featured && !badge && !q && !category && page === 1 && type === "OFFER";
  const [result, categories, featuredResult] = await Promise.all([
    searchOffers({ q, category, badge, type, page, pageSize: 16, loggedIn: true, forIndustries: forMe ? industries : undefined, excludeOwn: { userId: user.id, companyId: m?.companyId }, notBadge: showFeatured ? featured!.id : undefined }),
    getPopularCategories(12, "OFFER"),
    showFeatured ? searchOffers({ badge: featured!.id, type: "OFFER", page: 1, pageSize: 4, loggedIn: true, excludeOwn: { userId: user.id, companyId: m?.companyId } }) : null,
  ]);

  const href = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, category, badge, scope, type: type === "REQUEST" ? "REQUEST" : undefined, ...extra })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/offers?${s}` : "/offers";
  };
  const pill = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors ${active ? "border-accent bg-accent font-medium text-white" : "border-line bg-surface text-secondary hover:border-line-strong hover:text-ink"}`;

  return (
    <>
      <PageHeader
        eyebrow={ka.sgba.offersEyebrow}
        title={type === "REQUEST" ? ka.sgba.requests : ka.sgba.perksTitle}
        text={ka.sgba.offersText}
        action={
          <ButtonLink href={`/company/offers/new?type=${type}`}>
            <Icon name="plus" size={16} /> {type === "REQUEST" ? ka.sgba.createRequest : ka.sgba.addOffer}
          </ButtonLink>
        }
      />

      {activeBadge && (
        <section className="mb-6 border-l-[3px] border-accent bg-blue-soft px-5 py-4">
          <h2 className="text-lg font-bold text-ink">{activeBadge.name}</h2>
          {activeBadge.description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-secondary">{activeBadge.description}</p>}
        </section>
      )}

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <Link href={href({ category: undefined, badge: undefined })} className={pill(!category && !badge)}>{ka.sgba.all}</Link>
        {badges.map((b) => (
          <Link key={b.id} href={href({ badge: b.id, category: undefined, page: undefined })} className={pill(badge === b.id)}>{b.name}</Link>
        ))}
        {categories.map((c) => (
          <Link key={c.id} href={href({ category: c.slug, badge: undefined })} className={pill(category === c.slug)}>{c.name}</Link>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-[10px] border border-line bg-surface p-1 text-sm">
          <Link href={href({ type: undefined, page: undefined })} className={`rounded-lg px-3 py-1.5 ${type === "OFFER" ? "bg-chip font-semibold text-accent" : "text-muted"}`}>{ka.sgba.perksTitle}</Link>
          <Link href={href({ type: "REQUEST", page: undefined })} className={`rounded-lg px-3 py-1.5 ${type === "REQUEST" ? "bg-chip font-semibold text-accent" : "text-muted"}`}>{ka.sgba.requests}</Link>
        </div>
        {industries.length > 0 && (
          <div className="inline-flex rounded-[10px] border border-line bg-surface p-1 text-sm">
            <Link href={href({ scope: undefined, page: undefined })} className={`rounded-lg px-3 py-1.5 ${forMe ? "bg-chip font-semibold text-accent" : "text-muted"}`}>{ka.sectors.filterForMe}</Link>
            <Link href={href({ scope: "all", page: undefined })} className={`rounded-lg px-3 py-1.5 ${!forMe ? "bg-chip font-semibold text-accent" : "text-muted"}`}>{ka.sectors.filterAll}</Link>
          </div>
        )}
        <form action="/offers" className="w-full sm:w-auto" role="search">
          {scope && <input type="hidden" name="scope" value={scope} />}
          {category && <input type="hidden" name="category" value={category} />}
          {badge && <input type="hidden" name="badge" value={badge} />}
          {type === "REQUEST" && <input type="hidden" name="type" value="REQUEST" />}
          <label className="flex h-10 items-center gap-2 rounded-[10px] border border-line bg-surface px-3 text-muted sm:w-72">
            <Icon name="search" size={16} />
            <input name="q" type="search" defaultValue={q} placeholder={ka.catalog.searchPlaceholder} className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none" />
          </label>
        </form>
      </div>

      {featured && featuredResult && featuredResult.items.length > 0 && (
        <section className="mb-9">
          <div className="mb-4 flex items-end justify-between gap-4 border-b border-line pb-3">
            <div>
              <div className="text-xs font-bold text-accent">{ka.sgba.promoEyebrow}</div>
              <h2 className="text-xl font-bold tracking-[-0.3px] text-ink">{featured.name}</h2>
            </div>
            <Link href={href({ badge: featured.id, page: undefined })} className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-bold text-accent hover:text-accent-hover">
              {ka.sgba.viewAll} <Icon name="arrow" size={16} />
            </Link>
          </div>
          <OfferGrid offers={featuredResult.items} respondAs={m?.companyId ?? "personal"} ownSlug={m?.company.slug} />
        </section>
      )}
      {featured && featuredResult && featuredResult.items.length > 0 && result.items.length > 0 && (
        <h2 className="mb-4 text-xl font-bold tracking-[-0.3px] text-ink">{ka.sgba.perksTitle}</h2>
      )}

      {result.items.length === 0 && featuredResult && featuredResult.items.length > 0 ? null : result.items.length === 0 ? (
        <p className="rounded-[17px] border border-dashed border-line-strong bg-surface px-4 py-14 text-center text-sm text-muted">{ka.sgba.noOffers}</p>
      ) : (
        <OfferGrid offers={result.items} respondAs={m?.companyId ?? "personal"} ownSlug={m?.company.slug} />
      )}
      <Pagination page={result.page} pages={result.pages} basePath="/offers" params={{ q, category, badge, scope, type: type === "REQUEST" ? "REQUEST" : undefined }} />
    </>
  );
}
