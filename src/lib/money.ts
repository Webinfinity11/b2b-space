/**
 * Deterministic money formatting (same output on server and in the browser — Intl currency
 * data differs between Node and Chrome, which breaks hydration). Example: 1 234,50 ₾
 */
const SYMBOLS: Record<string, string> = { GEL: "₾", USD: "$", EUR: "€" };

export function formatAmount(n: number, currency?: string | null): string {
  const [int, frac] = Math.abs(n).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  const sign = n < 0 ? "−" : "";
  const sym = currency ? (SYMBOLS[currency] ?? currency) : "";
  return `${sign}${grouped},${frac}${sym ? `\u00a0${sym}` : ""}`;
}

/** YYYY-MM-DD for "today" in Georgia (server runs in UTC). */
export function todayInGeorgia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tbilisi" }).format(new Date());
}
