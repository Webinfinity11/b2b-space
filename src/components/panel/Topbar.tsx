import Link from "next/link";
import { ka } from "@/i18n/ka";
import { Icon } from "@/components/ui/Icon";
import { HeaderSearch } from "@/components/ui/HeaderSearch";
import { ProfileMenu } from "./ProfileMenu";
import { Wordmark } from "@/components/ui/Wordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** Top bar: wordmark + search on the left · theme, notifications and one account control on the right. */
export async function Topbar({
  fullName,
  sub,
  unread,
  searchAction = "/offers",
  notificationsHref = "/app/notifications",
  profileHref = "/app/profile",
  searchPlaceholder = ka.sgba.searchPlaceholder,
  companies,
  activeCompanyId = null,
  companyLinks = [],
  label,
  avatarUrl = null,
}: {
  subtitle?: string;
  searchPlaceholder?: string;
  firstName: string;
  fullName: string;
  sub: string;
  unread: number;
  searchAction?: string;
  notificationsHref?: string | null;
  profileHref?: string;
  companies?: { id: string; name: string }[];
  activeCompanyId?: string | null;
  companyLinks?: { href: string; label: string }[];
  /** Small tag next to the wordmark (e.g. "ადმინისტრირება"). */
  label?: string;
  avatarUrl?: string | null;
}) {
  const initials = fullName
    .split(" ")
    .map((p) => p.slice(0, 1))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <>
      <div className="flex shrink-0 items-center gap-3">
        <Wordmark />
        {label && <span className="hidden rounded-full bg-chip px-3 py-1 text-xs font-semibold text-accent lg:inline-block">{label}</span>}
      </div>
      <div className="hidden w-full max-w-[640px] flex-1 md:ml-4 md:block xl:ml-8">
        {searchAction === "/offers" ? (
          <HeaderSearch placeholder={searchPlaceholder} />
        ) : (
          <form action={searchAction} method="get" role="search">
            <label className="flex h-11 items-center gap-3 rounded-full border border-line bg-surface-2 px-4 text-muted focus-within:border-accent/50 focus-within:bg-surface">
              <Icon name="search" size={18} />
              <input name="q" type="search" placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="h-full w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none" />
            </label>
          </form>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
        <a href="/search" aria-label={ka.search.pageTitle} className="grid size-10 place-items-center rounded-[10px] text-ink hover:bg-chip md:hidden">
          <Icon name="search" size={20} />
        </a>
        <ThemeToggle />
        {notificationsHref && (
          <Link
            href={notificationsHref}
            aria-label={ka.panel.notifications}
            className="relative grid size-11 place-items-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-accent/40 hover:text-accent"
          >
            <Icon name="bell" size={20} />
            {unread > 0 && <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-accent ring-2 ring-surface" />}
          </Link>
        )}
        <ProfileMenu initials={initials} fullName={fullName} sub={sub} profileHref={profileHref} avatarUrl={avatarUrl} companies={companies} activeCompanyId={activeCompanyId} links={companyLinks} />
      </div>
    </>
  );
}
