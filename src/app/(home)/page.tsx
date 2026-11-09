/* eslint-disable @next/next/no-img-element -- user uploads and design photos */
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { formatDate } from "@/lib/format";
import { offerPriceLabel, quantityLabel } from "@/lib/offer-format";
import { pageParam, param } from "@/lib/params";
import { getCategoryTree, getPublicOffer, searchOffers, type PublicOffer } from "@/lib/public";
import { getCurrentUser } from "@/lib/session";
import { Badge, VerifiedMark } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { controlClass } from "@/components/ui/styles";
import { SiteShell } from "@/components/site/SiteShell";
import { CompanyLogo } from "@/components/site/CompanyLogo";

/** Decorative photos from the design kit — shown only when an offer has no own images, and labelled as such. */
const TILES = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `/images/tile-${i}.jpg`);
const tilesFor = (start: number) => [0, 1, 2, 3].map((k) => TILES[(start + k * 2) % 9]);

export default async function HomeWorkspace({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const loggedIn = Boolean(user);
  const t = param(sp.type);
  const type = t === "OFFER" || t === "REQUEST" ? (t as "OFFER" | "REQUEST") : undefined;
  const sort = param(sp.sort) === "validUntil" ? ("validUntil" as const) : undefined;
  const filters = { q: param(sp.q), category: param(sp.category), type, sort };
  const [result, categories] = await Promise.all([searchOffers({ ...filters, page: pageParam(sp.page), loggedIn }), getCategoryTree()]);

  const selectedId = param(sp.offer) ?? result.items[0]?.id;
  const selected = selectedId ? await getPublicOffer(selectedId, loggedIn) : null;
  const selectedIndex = Math.max(0, result.items.findIndex((o) => o.id === selected?.offer.id));

  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, ...extra })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <SiteShell mainClassName="px-0 py-0" searchDefault={filters.q}>
      <div className="grid min-w-0 lg:h-[calc(100dvh-72px)] lg:grid-cols-[minmax(340px,0.75fr)_minmax(0,1fr)]">
        {/* ── List column ── */}
        <section className="flex min-h-0 min-w-0 flex-col border-line lg:border-r" aria-label={ka.nav.offers}>
          <form action="/" method="get" className="flex flex-wrap gap-2 px-4 pt-5 sm:px-6">
            {filters.q && <input type="hidden" name="q" value={filters.q} />}
            <Pill name="type" value={type} label={ka.catalog.allTypes} options={[{ value: "OFFER", label: ka.enums.offerType.OFFER }, { value: "REQUEST", label: ka.enums.offerType.REQUEST }]} />
            <Pill
              name="category"
              value={filters.category}
              label={ka.catalog.category}
              options={categories.flatMap((c) => [{ value: c.slug, label: c.name }, ...c.children.map((ch) => ({ value: ch.slug, label: `— ${ch.name}` }))])}
            />
            <Pill name="sort" value={sort} label={ka.catalog.sortNewest} options={[{ value: "validUntil", label: ka.catalog.sortValidUntil }]} />
            <button type="submit" aria-label={ka.common.filter} title={ka.common.filter} className="grid size-9 place-items-center rounded-full bg-accent text-deep hover:bg-accent-hover">
              <Icon name="search" size={15} />
            </button>
          </form>
          <div className="flex items-center justify-between px-4 pb-2 pt-4 text-sm text-muted sm:px-6">
            <p>
              <strong className="text-ink">{result.total}</strong> {ka.ws.countLine}
            </p>
            <Link href="/offers" className="text-xs text-secondary hover:text-ink">{ka.ws.allOffers} →</Link>
          </div>
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-4 sm:px-6" role="list">
            {result.items.length === 0 ? (
              <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">{ka.ws.emptyList}</p>
            ) : (
              result.items.map((o, i) => <ListCard key={o.id} index={i} offer={o} selected={o.id === selected?.offer.id} href={qs({ offer: o.id })} />)
            )}
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[11px] text-muted sm:px-6">
            <span className="flex items-center gap-2">
              {ka.ws.space}
            </span>
            <Link href={user ? "/company/offers/new?type=OFFER" : "/register"} aria-label={ka.offerForm.newOffer} className="grid size-9 place-items-center rounded-full border border-line text-secondary hover:border-accent/40 hover:text-ink">
              <Icon name="plus" size={16} />
            </Link>
          </div>
        </section>

        {/* ── Detail column (desktop) ── */}
        <section className="hidden min-h-0 overflow-y-auto px-6 py-5 lg:block xl:px-8" aria-label={ka.ws.about}>
          {selected ? <Detail data={selected} index={selectedIndex} /> : <EmptyDetail registerHref={user ? "/company/new" : "/register"} />}
        </section>
      </div>
    </SiteShell>
  );
}

function Pill({ name, value, label, options }: { name: string; value?: string; label: string; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select name={name} defaultValue={value ?? ""} aria-label={label} className={`${controlClass} h-9 w-auto max-w-[132px] appearance-none truncate rounded-full pl-4 pr-8 text-xs`}>
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">
        <path d="m7 10 5 5 5-5" />
      </svg>
    </div>
  );
}

function ListCard({ offer, selected, href, index }: { offer: PublicOffer; selected: boolean; href: string; index: number }) {
  const isRequest = offer.type === "REQUEST";
  const publisher = offer.publisher.kind === "anonymous" ? ka.offer.anonymous : offer.publisher.name;
  const thumb = tilesFor(index)[0];
  const inner = (
    <>
      <img src={thumb} alt="" className={`h-[76px] w-[96px] shrink-0 rounded-[10px] object-cover transition ${selected ? "saturate-100" : "saturate-[.8] group-hover:saturate-100"}`} />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="truncate text-[11px] text-muted">{publisher}</div>
        <h3 className="mt-0.5 truncate text-[15px] font-semibold tracking-tight">{offer.title}</h3>
        <div className="truncate text-xs text-secondary">{[offer.category?.name, isRequest ? ka.offer.typeRequest : ka.offer.typeOffer].filter(Boolean).join(" · ")}</div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[11px] text-muted">
            <Icon name="arrowUp" size={12} /> {ka.enums.offerStatus[offer.status]}
          </span>
          <span className="truncate text-sm font-bold tabular-nums">{offerPriceLabel(offer)}</span>
        </div>
      </div>
    </>
  );
  const cls = `group flex gap-3.5 rounded-card border p-2.5 transition-colors ${
    selected ? "border-accent/35 bg-gradient-to-r from-accent/10 to-accent/[0.04] shadow-[0_4px_14px_rgb(0_0_0/0.12)]" : "border-line bg-card hover:border-accent/20 hover:bg-accent/[0.04]"
  }`;
  return (
    <div role="listitem" className="min-w-0">
      {/* Desktop: select in the split view. Mobile: open the offer page. */}
      <Link href={href} scroll={false} className={`${cls} hidden lg:flex`} aria-current={selected || undefined}>
        {inner}
      </Link>
      <Link href={`/offers/${offer.id}`} className={`${cls} lg:hidden`}>
        {inner}
      </Link>
    </div>
  );
}

function Detail({ data, index }: { data: NonNullable<Awaited<ReturnType<typeof getPublicOffer>>>; index: number }) {
  const { offer, attachments, restricted } = data;
  const images = attachments.filter((a) => a.isImage).map((a) => a.url);
  const illustrative = images.length === 0;
  const gallery = illustrative ? tilesFor(index) : [...images, ...tilesFor(index)].slice(0, 4);
  const isRequest = offer.type === "REQUEST";
  const stats: { icon: IconName; label: string; value: string; accent?: boolean }[] = [
    { icon: "shield", label: ka.ws.statType, value: isRequest ? ka.offer.typeRequest : ka.offer.typeOffer, accent: true },
    { icon: "box", label: ka.ws.statQty, value: quantityLabel(offer.quantity, offer.unit) },
    { icon: "clock", label: ka.ws.statTerm, value: offer.validUntil ? formatDate(offer.validUntil) : ka.offer.notSpecified },
    { icon: "pin", label: ka.ws.statCity, value: offer.city ?? ka.offer.notSpecified },
  ];
  const publisher =
    offer.publisher.kind === "anonymous" ? ka.offer.anonymous : offer.publisher.name;

  return (
    <div className="space-y-5">
      {/* Gallery */}
      <div className="grid h-[340px] grid-cols-[minmax(0,2.6fr)_minmax(0,1fr)] gap-3">
        <div className="relative min-h-0 overflow-hidden rounded-[16px] border border-line">
          <img src={gallery[0]} alt={illustrative ? "" : offer.title} className="h-full w-full object-cover" />
          <span className="absolute right-3 top-3 rounded-full bg-deep/60 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur">
            {illustrative ? ka.ws.illustrative : `1 / ${images.length}`}
          </span>
        </div>
        <div className="grid min-h-0 grid-rows-3 gap-3">
          {gallery.slice(1, 4).map((src, i) => (
            <div key={i} className="min-h-0 overflow-hidden rounded-[12px] border border-line">
              <img src={src} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold tracking-tight">{offer.title}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-secondary">
            <Icon name="pin" size={14} /> {publisher}
            <Icon name="arrow" size={13} className="text-muted" /> {offer.category?.name ?? ka.offer.notSpecified}
          </p>
        </div>
        <ButtonLink href={`/offers/${offer.id}`} variant="secondary" className="shrink-0">{ka.ws.open}</ButtonLink>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-secondary">
              <Icon name={s.icon} size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] text-muted">{s.label}</span>
              <span className={`block truncate text-sm font-semibold ${s.accent ? "text-accent" : ""}`}>{s.value}</span>
            </span>
          </div>
        ))}
      </div>

      {/* About */}
      <div>
        <h3 className="text-[15px] font-semibold">{ka.ws.about}</h3>
        {restricted ? (
          <p className="mt-2 text-sm text-muted">{ka.offer.registeredOnly}</p>
        ) : (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
            {offer.description}{" "}
          </p>
        )}
        <Link href={`/offers/${offer.id}`} className="mt-1 inline-block text-sm font-medium text-accent hover:underline">{ka.ws.more}</Link>
      </div>

      {/* Price card + white floating card (as in the design) */}
      <div className="relative pb-4">
        <div className="rounded-[16px] border border-accent/10 price-card p-6 xl:pr-[290px]">
          <div className="text-sm font-semibold">{ka.ws.priceTitle}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums xl:whitespace-nowrap">{offerPriceLabel(offer)}</div>
          <div className="mt-2 flex items-center gap-2 text-xs text-secondary">
            {offer.publisher.kind === "company" ? (
              <Link href={`/companies/${offer.publisher.slug}`} className="flex items-center gap-2 hover:text-ink">
                <CompanyLogo name={offer.publisher.name} url={offer.publisher.logoUrl} size={24} />
                {offer.publisher.name}
                {offer.publisher.verified && <VerifiedMark label={ka.company.verified} />}
              </Link>
            ) : (
              <span>
                {ka.ws.publishedBy}: {publisher}
              </span>
            )}
          </div>
          {offer.publisher.kind === "anonymous" && (
            <div className="mt-3">
              <Badge tone="info">{ka.offer.anonymousHint}</Badge>
            </div>
          )}
        </div>
        <div className="mt-4 rounded-[18px] bg-white p-5 text-deep shadow-2xl xl:absolute xl:-top-6 xl:right-4 xl:mt-0 xl:w-[270px] xl:rotate-[-5deg]">
          <div className="text-[15px] font-semibold">{ka.home.howItWorks}</div>
          <ol className="mt-3 space-y-2 text-[13px] text-[#334155]">
            {ka.home.steps.map((s, i) => (
              <li key={s.title} className="flex items-center gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-deep text-[10px] font-bold text-[#8EC5ED]">{i + 1}</span>
                {s.title}
              </li>
            ))}
          </ol>
          <Link href={`/offers/${offer.id}`} className="mt-4 flex h-11 items-center justify-center gap-2 rounded-full bg-deep text-sm font-medium text-white hover:bg-[#16304f]">
            {ka.ws.respond} <Icon name="arrow" size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyDetail({ registerHref }: { registerHref: string }) {
  return (
    <div className="card-glass grid h-full min-h-[420px] place-items-center rounded-[18px] p-10 text-center">
      <div>
        <h2 className="text-xl font-semibold">{ka.ws.emptyTitle}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{ka.ws.emptyText}</p>
        <ButtonLink href={registerHref} className="mt-6">{ka.ws.promoButton}</ButtonLink>
      </div>
    </div>
  );
}
