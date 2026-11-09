import Link from "next/link";
import type { ReactNode } from "react";
import { ka } from "@/i18n/ka";
import { getCurrentUser } from "@/lib/session";
import { getTheme } from "@/lib/theme";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { HeaderSearch } from "@/components/ui/HeaderSearch";
import { Shell, type NavGroup } from "@/components/panel/Shell";
import { ProfileMenu } from "@/components/panel/ProfileMenu";

/** Public-site workspace shell: same sidebar + top bar as the home page, for every public page. */
export async function SiteShell({
  children,
  searchDefault,
  mainClassName = "mx-auto max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8",
}: {
  children: ReactNode;
  searchDefault?: string;
  mainClassName?: string;
}) {
  const [user, theme] = await Promise.all([getCurrentUser(), getTheme()]);
  const panelHref = user?.platformRole === "ADMIN" ? "/admin" : "/app";

  const groups: NavGroup[] = [
    {
      items: [
        { href: "/", label: ka.ws.home, icon: "home" },
        { href: "/offers", label: ka.nav.offers, icon: "tag" },
        { href: "/companies", label: ka.nav.companies, icon: "building" },
        ...(user
          ? [{ href: panelHref, label: ka.ws.myPanel, icon: "user" as const }]
          : [
              { href: "/login", label: ka.nav.login, icon: "user" as const },
              { href: "/register", label: ka.nav.register, icon: "plus" as const },
            ]),
      ],
    },
  ];

  return (
    <Shell
      variant="site"
      homeHref="/"
      groups={groups}
      mainClassName={mainClassName}
      sidebarBottom={
        <div className="card-glass rounded-[15px] px-3 pb-4 pt-5 text-center">
          <h2 className="text-sm font-semibold">{ka.ws.promoTitle}</h2>
          <p className="mt-1 text-xs text-muted">{ka.ws.promoText}</p>
          <Link
            href={user ? "/company/new" : "/register"}
            className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-3 text-[12.5px] font-semibold text-deep hover:bg-accent-hover"
          >
            {ka.ws.promoButton} <Icon name="arrowUp" size={14} />
          </Link>
        </div>
      }
      footerNote={
        <div className="mt-3 space-y-2 px-3">
          <div className="flex flex-col gap-1 text-[11px] text-muted">
            <Link href="/terms" className="hover:text-secondary">{ka.footer.terms}</Link>
            <Link href="/privacy" className="hover:text-secondary">{ka.footer.privacy}</Link>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted">
            {ka.ws.space}
          </div>
        </div>
      }
      top={
        <>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-medium tracking-tight sm:text-[19px]">
              {user ? (
                <>
                  {ka.top.hello} <strong className="font-bold">{user.firstName}</strong>
                </>
              ) : (
                <strong className="font-bold">{ka.ws.hello}</strong>
              )}
              <span className="text-accent">.</span>
            </h1>
            <p className="mt-0.5 hidden items-center gap-1.5 text-xs text-muted sm:flex">
              <Icon name="pin" size={13} /> {ka.ws.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:block">
              <HeaderSearch defaultValue={searchDefault} />
            </div>
            <a href="/search" aria-label={ka.search.pageTitle} className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-secondary hover:border-accent/40 hover:text-ink md:hidden">
              <Icon name="search" size={17} />
            </a>
            <ThemeToggle initial={theme} />
            {user ? (
              <ProfileMenu
                initials={`${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`}
                firstName={user.firstName}
                fullName={`${user.firstName} ${user.lastName}`}
                sub={user.email}
                profileHref={panelHref}
              />
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" size="sm" className="max-sm:hidden">{ka.nav.login}</ButtonLink>
                <ButtonLink href="/register" size="sm">{ka.nav.register}</ButtonLink>
              </>
            )}
          </div>
        </>
      }
    >
      {children}
    </Shell>
  );
}
