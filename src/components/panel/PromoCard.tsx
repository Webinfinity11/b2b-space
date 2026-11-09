import Link from "next/link";
import { ka } from "@/i18n/ka";
import { Icon } from "@/components/ui/Icon";

/** Sidebar call-to-action card (Dealio "premium card" style). */
export function PromoCard({ href = "/company/offers/new?type=OFFER", label = ka.top.promoButton }: { href?: string; label?: string }) {
  return (
    <div className="card-glass rounded-[15px] px-3 pb-4 pt-5 text-center">
      <h2 className="text-sm font-semibold">{ka.top.promoTitle}</h2>
      <p className="mt-1 text-xs text-muted">{ka.top.promoText}</p>
      <Link href={href} className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-[13px] font-semibold text-deep hover:bg-accent-hover">
        {label} <Icon name="arrowUp" size={14} />
      </Link>
    </div>
  );
}
