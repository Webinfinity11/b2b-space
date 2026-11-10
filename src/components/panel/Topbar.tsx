import Link from "next/link";
import { ka } from "@/i18n/ka";
import { Icon } from "@/components/ui/Icon";
import { HeaderSearch } from "@/components/ui/HeaderSearch";
import { ProfileMenu } from "./ProfileMenu";
import { CompanyMenu } from "./CompanyMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** Top bar: wordmark + company menu · centered search · notifications · profile. */
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
  /** Shown instead of the company menu (e.g. "ადმინისტრირება"). */
  label?: string;
}) {
  const initials = fullName
    .split(" ")
    .map((p) => p.slice(0, 1))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <>
      <div className="flex shrink-0 items-center gap-5">
        <span className="text-[23px] font-bold leading-none tracking-[-1px] max-sm:text-xl">{ka.brand}</span>
        <span className="hidden h-[26px] w-px bg-line xl:block" />
        <div className="hidden xl:block">
          {label ? <span className="text-[15px] text-secondary">{label}</span> : companies ? <CompanyMenu companies={companies} activeId={activeCompanyId} links={companyLinks} /> : null}
        </div>
      </div>
      <div className="mx-auto hidden w-full max-w-[560px] flex-1 md:block">
        {searchAction === "/offers" ? (
          <HeaderSearch placeholder={searchPlaceholder} />
        ) : (
          <form action={searchAction} method="get" role="search">
            <label className="flex h-[42px] items-center gap-3 rounded-[11px] border border-line bg-surface-2 px-4 text-ink focus-within:border-accent/50 focus-within:bg-surface">
              <Icon name="search" size={19} />
              <input name="q" type="search" placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="h-full w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none" />
            </label>
          </form>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 md:ml-0">
        <a href="/search" aria-label={ka.search.pageTitle} className="grid size-10 place-items-center rounded-[10px] text-ink hover:bg-chip md:hidden">
          <Icon name="search" size={20} />
        </a>
        <ThemeToggle />
        {notificationsHref && (
          <Link href={notificationsHref} aria-label={ka.panel.notifications} className="relative grid h-[34px] w-[30px] place-items-center text-ink hover:text-accent">
            <Icon name="bell" size={24} />
            {unread > 0 && <span className="absolute right-0.5 top-0 size-2 rounded-full bg-accent ring-[3px] ring-surface" />}
          </Link>
        )}
        <ProfileMenu initials={initials} firstName="" fullName={fullName} sub={sub} profileHref={profileHref} />
      </div>
    </>
  );
}
