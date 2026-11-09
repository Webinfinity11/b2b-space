import Link from "next/link";
import { ka } from "@/i18n/ka";
import { Icon } from "@/components/ui/Icon";
import { ProfileMenu } from "./ProfileMenu";

/** Workspace top bar: greeting, search, notifications, profile (navy design). */
export function Topbar({
  firstName,
  fullName,
  sub,
  unread,
  searchAction = "/offers",
  notificationsHref = "/app/notifications",
  profileHref = "/app/profile",
  subtitle = ka.top.subtitle,
  searchPlaceholder = ka.top.search,
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
}) {
  const initials = fullName
    .split(" ")
    .map((p) => p.slice(0, 1))
    .join("")
    .slice(0, 2);
  return (
    <>
      <div className="min-w-0">
        <h1 className="truncate text-[17px] font-medium tracking-tight sm:text-[19px]">
          {ka.top.hello} <strong className="font-bold">{firstName}</strong>
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-0.5 hidden items-center gap-1.5 text-xs text-muted sm:flex">
          <Icon name="pin" size={13} /> {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <form action={searchAction} method="get" className="hidden md:block" role="search">
          <label className="flex h-10 w-60 items-center gap-2 rounded-[10px] border border-line bg-white/[0.015] px-3 text-muted focus-within:border-accent/50">
            <Icon name="search" size={16} />
            <input name="q" type="search" placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none" />
          </label>
        </form>
        {notificationsHref && (
          <Link href={notificationsHref} aria-label={ka.panel.notifications} className="relative grid size-10 place-items-center rounded-full border border-line text-secondary hover:border-accent/40 hover:text-ink">
            <Icon name="bell" size={17} />
            {unread > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-accent ring-2 ring-navy" />}
          </Link>
        )}
        <ProfileMenu initials={initials} firstName={firstName} fullName={fullName} sub={sub} profileHref={profileHref} />
      </div>
    </>
  );
}
