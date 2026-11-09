import { ka } from "@/i18n/ka";
import type { CategoryNode } from "@/lib/public";
import { controlClass } from "@/components/ui/styles";
import { buttonClass } from "@/components/ui/Button";
import Link from "next/link";

type Opt = { value: string; label: string };

/** Plain GET form — works without JavaScript and keeps filters in the URL. */
export function CatalogFilters({
  action,
  values,
  categories,
  cities,
  sortOptions,
  typeFilter,
  verifiedFilter,
}: {
  action: string;
  values: Record<string, string | undefined>;
  categories: CategoryNode[];
  cities: string[];
  sortOptions: Opt[];
  typeFilter?: boolean;
  verifiedFilter?: boolean;
}) {
  const sel = `${controlClass} h-10`;
  return (
    <form action={action} method="get" className="rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <label className="sr-only" htmlFor="q">{ka.catalog.search}</label>
        <input id="q" name="q" type="search" defaultValue={values.q} placeholder={ka.catalog.searchPlaceholder} className={`${controlClass} h-10`} />
        <label className="sr-only" htmlFor="category">{ka.catalog.category}</label>
        <select id="category" name="category" defaultValue={values.category ?? ""} className={sel}>
          <option value="">{ka.catalog.allCategories}</option>
          {categories.map((c) => (
            <optgroup key={c.id} label={c.name}>
              <option value={c.slug}>{c.name} — {ka.common.all}</option>
              {c.children.map((ch) => (
                <option key={ch.id} value={ch.slug}>{ch.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {typeFilter ? (
          <>
            <label className="sr-only" htmlFor="type">{ka.catalog.type}</label>
            <select id="type" name="type" defaultValue={values.type ?? ""} className={sel}>
              <option value="">{ka.catalog.allTypes}</option>
              <option value="OFFER">{ka.enums.offerType.OFFER}</option>
              <option value="REQUEST">{ka.enums.offerType.REQUEST}</option>
            </select>
          </>
        ) : (
          <>
            <label className="sr-only" htmlFor="country">{ka.catalog.country}</label>
            <select id="country" name="country" defaultValue={values.country ?? ""} className={sel}>
              <option value="">{ka.catalog.country}</option>
              {Object.entries(ka.countries).filter(([k]) => k !== "OTHER").map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </>
        )}
        <label className="sr-only" htmlFor="city">{ka.catalog.city}</label>
        <select id="city" name="city" defaultValue={values.city ?? ""} className={sel}>
          <option value="">{ka.catalog.anyCity}</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          {verifiedFilter && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="verified" value="1" defaultChecked={values.verified === "1"} className="size-4" />
              {ka.catalog.verifiedOnly}
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-muted">
            {ka.catalog.sort}
            <select name="sort" defaultValue={values.sort ?? ""} className={`${controlClass} h-9 w-auto`}>
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <Link href={action} className={buttonClass("ghost", "md")}>{ka.catalog.reset}</Link>
          <button type="submit" className={buttonClass("primary", "md")}>{ka.catalog.search}</button>
        </div>
      </div>
    </form>
  );
}
