import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { startCompanyChatAction } from "@/actions/chat";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { CITIES } from "@/lib/cities";
import { db } from "@/lib/db";
import { pageParam, param } from "@/lib/params";
import { companyName, getCategoryTree, searchCompanies } from "@/lib/public";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { controlClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: ka.sgba.bizTitle };

const ROLE_STYLE: Record<string, string> = {
  SELLER: "bg-[#e3f4ec] text-[#20815d]",
  BUYER: "bg-blue-soft text-accent",
  BOTH: "bg-[#efe9f8] text-[#6b46a3]",
};

export default async function BusinessesPage({ searchParams }: PageProps<"/companies">) {
  const user = await requireUser("/companies");
  const m = await getActiveMembership(user.id);
  const sp = await searchParams;
  const q = param(sp.q);
  const category = param(sp.category);
  const city = param(sp.city);
  const r = param(sp.role);
  const role = r === "BUYER" || r === "SELLER" || r === "BOTH" ? r : undefined;
  const sz = param(sp.size);
  const size = sz === "SMALL" || sz === "MEDIUM" || sz === "LARGE" ? sz : undefined;
  const page = pageParam(sp.page);

  const [result, categories, counts] = await Promise.all([
    searchCompanies({ q, category, city, role, size, page, pageSize: 30 }),
    getCategoryTree(),
    db.company.groupBy({ by: ["businessRole"], where: { verificationStatus: "VERIFIED" }, _count: true }),
  ]);
  const count = (k: string) => counts.find((c) => c.businessRole === k)?._count ?? 0;
  const totalVerified = counts.reduce((s, c) => s + c._count, 0);
  const canMessage = Boolean(m);

  return (
    <>
      <PageHeader eyebrow={ka.sgba.bizEyebrow} title={ka.sgba.bizTitle} text={ka.sgba.bizText(result.total)} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-line-strong bg-blue-soft px-5 py-4">
        <div className="flex items-start gap-3">
          <Icon name="shield" size={20} className="mt-0.5 text-accent-strong" />
          <div>
            <div className="text-sm font-semibold text-ink">{ka.sgba.bizStrip(totalVerified)}</div>
            <div className="text-xs text-muted">{ka.sgba.bizStripText}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {(["BUYER", "SELLER", "BOTH"] as const).map((k) => (
            <span key={k} className={`rounded-full px-3 py-1 ${ROLE_STYLE[k]}`}>{count(k)} {ka.sgba.rolesPlural[k]}</span>
          ))}
        </div>
      </div>

      <form action="/companies" className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))_auto]">
        <label className="flex h-10 items-center gap-2 rounded-[10px] border border-line bg-surface px-3 text-muted sm:col-span-2 lg:col-span-1">
          <Icon name="search" size={16} />
          <input name="q" type="search" defaultValue={q} placeholder={ka.sgba.bizSearch} className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none" />
        </label>
        <select name="role" defaultValue={role ?? ""} aria-label={ka.sgba.role} className={`${controlClass} h-10`}>
          <option value="">{ka.sgba.role}: {ka.sgba.all}</option>
          {(["BUYER", "SELLER", "BOTH"] as const).map((k) => <option key={k} value={k}>{ka.sgba.roles[k]}</option>)}
        </select>
        <select name="category" defaultValue={category ?? ""} aria-label={ka.sgba.industry} className={`${controlClass} h-10`}>
          <option value="">{ka.sgba.industry}: {ka.sgba.all}</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="city" defaultValue={city ?? ""} aria-label={ka.sgba.city} className={`${controlClass} h-10`}>
          <option value="">{ka.sgba.city}: {ka.sgba.all}</option>
          {CITIES.filter((c) => c !== "სხვა").map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="size" defaultValue={size ?? ""} aria-label={ka.sgba.size} className={`${controlClass} h-10`}>
          <option value="">{ka.sgba.size}: {ka.sgba.all}</option>
          {(["SMALL", "MEDIUM", "LARGE"] as const).map((k) => <option key={k} value={k}>{ka.sgba.sizeFull[k]}</option>)}
        </select>
        <div className="flex gap-2">
          <button type="submit" className="h-10 flex-1 rounded-[10px] bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover">{ka.catalog.search}</button>
          <Link href="/companies" className="grid h-10 place-items-center rounded-[10px] border border-line bg-surface px-4 text-sm text-secondary hover:text-ink">{ka.sgba.clear}</Link>
        </div>
      </form>

      {result.items.length === 0 ? (
        <p className="rounded-[17px] border border-dashed border-line-strong bg-surface px-4 py-14 text-center text-sm text-muted">{ka.sgba.noBusinesses}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.items.map((c) => {
            const name = companyName(c);
            const abbr = name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase();
            const industry = c.categories[0]?.category.name ?? c.customCategory ?? "—";
            const self = c.id === m?.companyId;
            return (
              <article key={c.id} className="flex flex-col rounded-[16px] border border-line bg-surface p-5 transition hover:border-line-strong hover:shadow-[0_8px_24px_-18px_rgb(16_43_76/0.35)]">
                <div className="flex items-start justify-between gap-3">
                  {c.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- uploaded logos
                    <img src={c.logoUrl} alt="" className="size-12 rounded-[12px] border border-line object-cover" />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-[12px] bg-blue-soft text-sm font-bold text-accent">{abbr}</span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e3f4ec] px-2.5 py-1 text-[11px] font-semibold text-[#20815d]">
                    <Icon name="check" size={12} /> {ka.sgba.verified}
                  </span>
                </div>
                <span className={`mt-4 w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ROLE_STYLE[c.businessRole]}`}>{ka.sgba.roles[c.businessRole]}</span>
                <h3 className="mt-2 text-base font-semibold text-ink">{name}</h3>
                <div className="text-sm text-muted">{industry}</div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-secondary">
                  {c.city && <span className="inline-flex items-center gap-1"><Icon name="pin" size={13} /> {c.city}</span>}
                  <span className="inline-flex items-center gap-1"><Icon name="building" size={13} /> {ka.sgba.sizeFull[c.size]}</span>
                </div>
                <div className="mt-3 flex-1 rounded-[10px] bg-canvas px-3 py-2.5">
                  <div className="text-[11px] text-muted">{ka.sgba.direction}</div>
                  <div className="text-sm font-medium">{c.direction || "—"}</div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link href={`/companies/${c.slug}`} className="grid h-10 place-items-center rounded-[10px] border border-line text-sm font-medium text-ink hover:bg-canvas">
                    {ka.sgba.profile}
                  </Link>
                  {self || !canMessage ? (
                    <span className="grid h-10 place-items-center rounded-[10px] bg-chip text-xs text-muted">{self ? ka.sgba.selfCompany : "—"}</span>
                  ) : (
                    <form action={startCompanyChatAction}>
                      <input type="hidden" name="companyId" value={c.id} />
                      <button type="submit" className="flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] bg-accent text-sm font-semibold text-white hover:bg-accent-hover">
                        <Icon name="arrow" size={14} /> {ka.sgba.message}
                      </button>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Pagination page={result.page} pages={result.pages} basePath="/companies" params={{ q, category, city, role, size }} />
    </>
  );
}
