import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { getActiveMembership, getMemberships, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { companyName } from "@/lib/public";
import { Shell, type NavGroup } from "@/components/panel/Shell";
import { Topbar } from "@/components/panel/Topbar";

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

  const n = ka.sgba.nav;
  const canFinance = !active || hasPermission(active, "finance.view") || hasPermission(active, "invoices.view");
  const owner = active?.role === "OWNER";
  const groups: NavGroup[] = [
    {
      items: [
        { href: "/app", label: n.home, icon: "home" },
        { href: "/offers", label: n.offers, icon: "tag" },
        { href: "/companies", label: n.businesses, icon: "building" },
        { href: "/app/campaigns", label: n.campaigns, icon: "megaphone" },
        { href: "/app/notifications", label: n.messages, badge: unread, icon: "bell" },
        { href: "/app/conversations", label: n.deals, icon: "handshake" },
        ...(owner ? [{ href: "/company/team", label: n.employees, icon: "users" as const }] : []),
        { href: "/app/invoices", label: n.documents, icon: "file" },
        ...(canFinance ? [{ href: "/app/finance", label: n.finance, icon: "coins" as const }] : []),
        { href: "/app/analytics", label: n.analytics, icon: "chart" },
      ],
    },
  ];
  if (active) {
    groups.push({
      title: n.myCompany,
      items: [
        { href: "/company/offers", label: n.myOffers, icon: "star" },
        { href: "/company/requests", label: n.myRequests, icon: "search" },
        ...(hasPermission(active, "company.edit") ? [{ href: "/company/profile", label: n.companyProfile, icon: "building" as const }] : []),
      ],
    });
  }
  groups.push({ items: [{ href: owner ? "/company/settings" : "/app/profile", label: owner ? n.settings : ka.panel.profile, icon: "settings" }] });

  const companies = memberships.map((mm) => ({ id: mm.companyId, name: companyName(mm.company) }));
  const companyLinks = [
    ...(active ? [{ href: `/companies/${active.company.slug}`, label: n.companyProfile }] : []),
    ...(active && hasPermission(active, "company.edit") ? [{ href: "/company/profile", label: ka.sgba.editProfile }] : []),
    ...(owner ? [{ href: "/company/team", label: n.employees }, { href: "/company/settings", label: n.settings }] : []),
  ];

  return (
    <Shell
      variant="panel"
      homeHref="/app"
      groups={groups}
      top={
        <Topbar
          firstName={user.firstName}
          fullName={`${user.firstName} ${user.lastName}`}
          sub={active ? `${companyName(active.company)} · ${ka.enums.memberRole[active.role]}` : ka.panel.personalMode}
          unread={unread}
          companies={companies}
          activeCompanyId={active?.companyId ?? null}
          companyLinks={companyLinks}
        />
      }
    >
      {children}
    </Shell>
  );
}
