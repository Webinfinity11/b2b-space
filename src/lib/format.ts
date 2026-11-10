import { Prisma } from "@/generated/prisma/client";
import { formatAmount } from "./money";

const LOCALE = "ka-GE";
/** Server runs in UTC (Railway); users are in Georgia. */
const TZ = "Asia/Tbilisi";

type DateInput = Date | string | number | null | undefined;
type Amount = Prisma.Decimal | string | number | null | undefined;

export function formatDate(value: DateInput): string {
  if (value == null) return "—";
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(value));
}

export function formatDateTime(value: DateInput): string {
  if (value == null) return "—";
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short", timeZone: TZ }).format(new Date(value));
}

export function formatTime(value: DateInput): string {
  if (value == null) return "—";
  return new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(value));
}

export function formatNumber(value: Amount, maxFractionDigits = 3): string {
  if (value == null) return "—";
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: maxFractionDigits }).format(Number(value.toString()));
}

/**
 * Formats a money amount in one currency. Amounts are stored as Decimal; conversion to Number
 * happens only for display. Never sum different currencies — see sumByCurrency.
 */
export function formatMoney(value: Amount, currency: string | null | undefined): string {
  if (value == null) return "—";
  const n = Number(value.toString());
  if (!currency) return formatNumber(n, 2);
  return formatAmount(n, currency);
}
