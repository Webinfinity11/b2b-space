import Link from "next/link";
import type { ReactNode } from "react";
import { ka } from "@/i18n/ka";
import { Icon } from "@/components/ui/Icon";
import { BrandMarkSvg } from "@/components/ui/BrandMark";
import { Wordmark } from "@/components/ui/Wordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** Brand mark used on guest pages. */
export function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-[12px] bg-blue-soft" style={{ width: size, height: size }}>
      <BrandMarkSvg className="h-[60%] w-[46%]" />
    </span>
  );
}

type Hero = { eyebrow: string; title: string; text: string; points: readonly string[] };

/**
 * Guest pages (sign-in/registration, admin sign-in): light-blue brand panel on the left
 * (stays in place while the form scrolls), the form card on the right.
 */
export function AuthCard({
  title,
  text,
  children,
  footer,
  hero = { eyebrow: ka.sgba.heroEyebrow, title: ka.sgba.heroTitle, text: ka.sgba.heroText, points: ka.sgba.heroPoints },
  badge,
}: {
  title: string;
  text: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  hero?: Hero;
  badge?: string;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-soft to-blue-soft-2 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:px-14 lg:py-12 xl:px-20">
        <Link href="/" className="flex items-center gap-3 text-ink">
          <BrandMarkSvg />
          <Wordmark size="lg" />
        </Link>
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-bold tracking-[0.2em] text-accent">{hero.eyebrow}</p>
          <h1 className="mt-4 text-[36px] font-bold leading-[1.2] tracking-[-1px] text-ink xl:text-[44px]">{hero.title}</h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-secondary">{hero.text}</p>
          <ul className="mt-8 grid gap-3 text-sm text-ink">
            {hero.points.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="grid size-7 place-items-center rounded-full bg-surface text-accent shadow-[0_4px_12px_rgb(33_55_105/0.08)]">
                  <Icon name="check" size={15} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-2 text-xs text-muted">
          <Icon name="shield" size={14} /> {ka.sgba.secure}
        </p>
        {/* Faint brand mark as decoration */}
        <BrandMarkSvg className="pointer-events-none absolute -bottom-16 -right-10 h-[340px] w-[260px] opacity-[0.07]" />
      </section>

      <section className="relative flex justify-center px-4 py-10 sm:px-8 lg:items-center lg:py-14">
        <ThemeToggle className="absolute right-4 top-4" />
        <div className="w-full max-w-[600px]">
          <Link href="/" className="mb-6 flex items-center justify-center gap-2.5 text-ink lg:hidden">
            <BrandMarkSvg className="h-[34px] w-[26px]" />
            <Wordmark />
          </Link>
          <div className="rounded-[20px] border border-line bg-surface p-6 shadow-[0_14px_40px_rgb(33_55_105/0.08)] sm:p-9">
            <div className="mb-7 flex items-center gap-3.5">
              <BrandMark />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-[20px] font-bold text-ink">{title}</h1>
                  {badge && <span className="rounded-md bg-blue-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">{badge}</span>}
                </div>
                <p className="mt-0.5 text-xs text-muted">{text}</p>
              </div>
            </div>
            {children}
            {footer && <div className="mt-6">{footer}</div>}
          </div>
          <p className="mt-5 flex justify-center gap-4 text-[11px] text-muted">
            <Link href="/terms" className="hover:text-ink">{ka.footer.terms}</Link>
            <Link href="/privacy" className="hover:text-ink">{ka.footer.privacy}</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
