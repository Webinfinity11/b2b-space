import Link from "next/link";
import { ka } from "@/i18n/ka";
import { Wordmark } from "@/components/ui/Wordmark";
import { BrandMarkSvg } from "./BrandMark";

/** Bar mark + "B2B Space" wordmark. */
export function Logo({ href = "/" }: { tone?: "dark" | "light"; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 text-ink" aria-label={ka.brand}>
      <BrandMarkSvg className="h-[30px] w-[23px]" />
      <Wordmark size="sm" />
    </Link>
  );
}
