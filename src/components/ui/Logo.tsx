import Link from "next/link";
import { ka } from "@/i18n/ka";

/** Text logo with a geometric bar mark (navy design system). */
export function Logo({ href = "/" }: { tone?: "dark" | "light"; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-ink" aria-label={ka.brand}>
      <svg width="24" height="26" viewBox="0 0 30 30" aria-hidden="true">
        <path d="M3 12 9 8v19H3ZM12 3l6 4v20h-6ZM21 11l6 4v12h-6Z" fill="currentColor" />
        <path d="M3 6 9 2v4L3 10ZM21 4l6 4v4l-6-4Z" fill="#8EC5ED" />
      </svg>
      <span className="text-[19px] font-bold tracking-[-0.03em]">{ka.brand}</span>
    </Link>
  );
}
