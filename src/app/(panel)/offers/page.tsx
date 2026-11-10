import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { pageParam, param } from "@/lib/params";
import { getPopularCategories, searchOffers } from "@/lib/public";
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
  const t = param(sp.tag);
  const tag = t === "MAIN_PARTNER" || t === "WOMEN_BUSINESS" ? t : undefined;
  const type = param(sp.type) === "REQUEST" ? ("REQUEST" as const) : ("OFFER" as const);
  const page = pageParam(sp.page);
  const [result, categories] = await Promise.all([
    searchOffers({ q, category, tag, type, page, pageSize: 16, loggedIn: true }),
    getPopularCategories(12, "OFFER"),
  ]);

  const href = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, category, tag, type: type === "REQUEST" ? "REQUEST" : undefined, ...extra })) if (v) p.set(k, v);
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

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <Link href={href({ category: undefined, tag: undefined })} className={pill(!category && !tag)}>{ka.sgba.all}</Link>
        {categories.map((c) => (
          <Link key={c.id} href={href({ category: c.slug, tag: undefined })} className={pill(category === c.slug)}>{c.name}</Link>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-[10px] border border-line bg-surface p-1 text-sm">
          <Link href={href({ type: undefined, page: undefined })} className={`rounded-lg px-3 py-1.5 ${type === "OFFER" ? "bg-chip font-semibold text-accent" : "text-muted"}`}>{ka.sgba.perksTitle}</Link>
          <Link href={href({ type: "REQUEST", page: undefined })} className={`rounded-lg px-3 py-1.5 ${type === "REQUEST" ? "bg-chip font-semibold text-accent" : "text-muted"}`}>{ka.sgba.requests}</Link>
        </div>
        <form action="/offers" className="w-full sm:w-auto" role="search">
          {category && <input type="hidden" name="category" value={category} />}
          {tag && <input type="hidden" name="tag" value={tag} />}
          {type === "REQUEST" && <input type="hidden" name="type" value="REQUEST" />}
          <label className="flex h-10 items-center gap-2 rounded-[10px] border border-line bg-surface px-3 text-muted sm:w-72">
            <Icon name="search" size={16} />
            <input name="q" type="search" defaultValue={q} placeholder={ka.catalog.searchPlaceholder} className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none" />
          </label>
        </form>
      </div>

      {result.items.length === 0 ? (
        <p className="rounded-[17px] border border-dashed border-line-strong bg-surface px-4 py-14 text-center text-sm text-muted">{ka.sgba.noOffers}</p>
      ) : (
        <OfferGrid offers={result.items} respondAs={m?.companyId ?? "personal"} ownSlug={m?.company.slug} />
      )}
      <Pagination page={result.page} pages={result.pages} basePath="/offers" params={{ q, category, tag, type: type === "REQUEST" ? "REQUEST" : undefined }} />
    </>
  );
}
