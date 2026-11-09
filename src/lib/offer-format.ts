import { ka } from "@/i18n/ka";
import { formatMoney, formatNumber } from "./format";

type PriceLike = {
  priceType: "FIXED" | "FROM" | "RANGE" | "NEGOTIABLE" | "NONE";
  priceMin: string | { toString(): string } | null;
  priceMax: string | { toString(): string } | null;
  currency: string | null;
};

export function offerPriceLabel(o: PriceLike): string {
  switch (o.priceType) {
    case "FIXED":
      return o.priceMin != null ? formatMoney(o.priceMin.toString(), o.currency) : ka.offer.notSpecified;
    case "FROM":
      return o.priceMin != null ? ka.offer.priceFrom(formatMoney(o.priceMin.toString(), o.currency)) : ka.offer.notSpecified;
    case "RANGE":
      return o.priceMin != null && o.priceMax != null
        ? ka.offer.priceRange(formatMoney(o.priceMin.toString(), o.currency), formatMoney(o.priceMax.toString(), o.currency))
        : ka.offer.notSpecified;
    case "NEGOTIABLE":
      return ka.offer.negotiable;
    default:
      return ka.offer.notSpecified;
  }
}

export function quantityLabel(q: string | { toString(): string } | null, unit: string | null) {
  if (q == null) return ka.offer.notSpecified;
  return `${formatNumber(q.toString())}${unit ? ` ${unit}` : ""}`;
}
