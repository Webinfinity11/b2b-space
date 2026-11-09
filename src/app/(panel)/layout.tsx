import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { getActiveMembership, getMemberships, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { companyName } from "@/lib/public";
import { Shell, type NavGroup } from "@/components/panel/Shell";
import { CompanySwitcher } from "@/components/panel/CompanySwitcher";
import { Topbar } from "@/components/panel/Topbar";
import { PromoCard } from "@/components/panel/PromoCard";

export const metadata: Metadata = { title: { default: ka.panel.title, template: `%s — ${ka.brand}` } };

/**
 * Participant panel (users & companies). Completely separate from /admin:
 * own layout, navigation and guards. Every page/action re-checks access on the server.
 */
export default async function PanelLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const [memberships, active, unread] = await Promise.all([
    getMemberships(user.id),
    getActiveMembership(user.id),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  // Groups follow what people want to do: trade → manage company → own account.
  const canFinance = !active || hasPermission(active, "finance.view") || hasPermission(active, "invoices.view");
  const groups: NavGroup[] = [
    { items: [{ href: "/app", label: ka.panel.dashboard, icon: "home" }] },
    {
      title: ka.guide.navTrade,
      items: [
        { href: "/company/offers", label: ka.panel.myOffers, icon: "tag" },
        { href: "/company/requests", label: ka.panel.myRequests, icon: "search" },
        { href: "/company/responses", label: ka.panel.responses, icon: "inbox" },
        { href: "/app/conversations", label: ka.panel.conversations, icon: "chat" },
        { href: "/app/invoices", label: ka.panel.invoices, icon: "invoice" },
        ...(canFinance ? [{ href: "/app/finance", label: ka.panel.finance, icon: "chart" as const }] : []),
      ],
    },
  ];

  if (active) {
    const company: NavGroup["items"] = [{ href: "/company", label: ka.panel.companyOverview, icon: "building" }];
    if (hasPermission(active, "company.edit")) {
      company.push(
        { href: "/company/profile", label: ka.panel.companyProfile, icon: "list" },
        { href: "/company/media", label: ka.panel.companyMedia, icon: "image" },
      );
    }
    if (active.role === "OWNER") {
      company.push(
        { href: "/company/team", label: ka.panel.team, icon: "users" },
        { href: "/company/verification", label: ka.panel.verification, icon: "shield" },
        { href: "/company/settings", label: ka.panel.settings, icon: "settings" },
      );
    }
    groups.push({ title: `${ka.guide.navCompany} · ${companyName(active.company)}`, items: company });
  }

  groups.push({
    title: ka.guide.navAccount,
    items: [
      { href: "/app/profile", label: ka.panel.profile, icon: "user" },
      { href: "/app/notifications", label: ka.panel.notifications, badge: unread, icon: "bell" },
    ],
  });

  const switcher =
    memberships.length > 0 ? (
      memberships.length > 1 ? (
        <CompanySwitcher companies={memberships.map((m) => ({ id: m.companyId, name: companyName(m.company) }))} activeId={active!.companyId} />
      ) : null
    ) : (
      <Link href="/company/new" className="flex h-10 items-center justify-center rounded-full border border-dashed border-accent/40 text-sm font-medium text-accent hover:bg-accent/5">
        + {ka.panel.createCompany}
      </Link>
    );

  return (
    <Shell
      variant="panel"
      homeHref="/app"
      groups={groups}
      sidebarTop={switcher}
      sidebarBottom={<PromoCard />}
      top={
        <Topbar
          firstName={user.firstName}
          fullName={`${user.firstName} ${user.lastName}`}
          sub={active ? `${companyName(active.company)} · ${ka.enums.memberRole[active.role]}` : ka.panel.personalMode}
          unread={unread}
        />
      }
    >
      {children}
    </Shell>
  );
}
