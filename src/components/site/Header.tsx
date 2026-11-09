import Link from "next/link";
import { ka } from "@/i18n/ka";
import { getCurrentUser } from "@/lib/session";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { MobileMenu } from "./MobileMenu";

const links = [
  { href: "/companies", label: ka.nav.companies },
  { href: "/offers", label: ka.nav.offers },
  { href: "/#how-it-works", label: ka.nav.howItWorks },
];

export async function Header() {
  const user = await getCurrentUser();
  const panelHref = user?.platformRole === "ADMIN" ? "/admin" : "/app";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-navy/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-site items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 rounded-full border border-line bg-white/[0.015] p-1 md:flex" aria-label={ka.nav.menu}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-4 py-1.5 text-[13.5px] text-secondary transition-colors hover:bg-accent/[0.065] hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <ButtonLink href={panelHref} variant="accent" size="sm">
              {user.platformRole === "ADMIN" ? ka.nav.adminPanel : ka.nav.myPanel}
            </ButtonLink>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-4 py-2 text-sm text-secondary hover:text-ink">
                {ka.nav.login}
              </Link>
              <ButtonLink href="/register" variant="accent" size="sm">
                {ka.nav.register}
              </ButtonLink>
            </>
          )}
        </div>
        <MobileMenu
          links={links}
          account={
            user
              ? [{ href: panelHref, label: user.platformRole === "ADMIN" ? ka.nav.adminPanel : ka.nav.myPanel }]
              : [
                  { href: "/login", label: ka.nav.login },
                  { href: "/register", label: ka.nav.register },
                ]
          }
        />
      </div>
    </header>
  );
}
