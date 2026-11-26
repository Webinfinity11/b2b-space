import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { Shell, type NavGroup } from "@/components/panel/Shell";
import { Topbar } from "@/components/panel/Topbar";
import { AdminNav } from "@/components/panel/AdminNav";

export const metadata: Metadata = {
  title: { default: ka.admin.title, template: `%s — ${ka.admin.title}` },
  robots: { index: false, follow: false },
};

/**
 * Platform admin panel — a separate application area with its own layout,
 * navigation and guard (requireAdmin → 404 for everyone else).
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const [pending, pendingUsers, newCampaigns, openReports] = await Promise.all([
    db.company.count({ where: { verificationStatus: "IN_REVIEW", createdBy: { status: { not: "PENDING" } } } }),
    db.user.count({ where: { status: "PENDING" } }),
    db.campaignRequest.count({ where: { status: "NEW" } }),
    db.report.count({ where: { status: "OPEN" } }),
  ]);
  const groups: NavGroup[] = [
    {
      items: [
        { href: "/admin", short: "მიმოხილვა", label: ka.admin.overview, icon: "home" },
        { href: "/admin/offers", short: "შეთავაზებები", label: ka.admin.offers, icon: "tag" },
        { href: "/admin/registrations", short: "რეგისტრაციები", label: ka.sgba.approvalsTitle, badge: pendingUsers, icon: "inbox" },
      ],
    },
    {
      title: ka.admin.companies,
      items: [
        { href: "/admin/companies", label: ka.admin.companies, badge: pending, icon: "building" },
        { href: "/admin/users", label: ka.admin.users, icon: "users" },
        { href: "/admin/categories", label: ka.admin.categories, icon: "folder" },
        { href: "/admin/badges", label: ka.sgba.badgesTitle, icon: "star" },
      ],
    },
    {
      title: "მოდერაცია",
      items: [
        { href: "/admin/conversations", short: "მოლაპარაკებები", label: ka.admin.conversations, icon: "chat" },
        { href: "/admin/campaigns", short: "კამპანიები", label: ka.sgba.campAdminTitle, badge: newCampaigns, icon: "trend" },
        { href: "/admin/reports", short: "საჩივრები", label: ka.reports.adminTitle, badge: openReports, icon: "shield" },
      ],
    },
    {
      title: ka.admin.financeGroup,
      items: [
        { href: "/admin/invoices", label: ka.admin.invoices, icon: "invoice" },
        { href: "/admin/commissions", short: "საკომისიოები", label: ka.sgba.commissionsAdmin, icon: "check" },
        { href: "/admin/finance", short: "ფინანსები", label: ka.admin.finance, icon: "chart" },
        { href: "/admin/analytics", short: "ანალიტიკა", label: ka.analyticsFilter.adminTitle, icon: "trend" },
      ],
    },
    {
      title: ka.admin.systemGroup,
      items: [
        { href: "/admin/settings", label: ka.settings.title, icon: "settings" },
        { href: "/admin/audit-log", short: "ჟურნალი", label: ka.admin.auditLog, icon: "list" },
      ],
    },
  ];
  return (
    <Shell
      variant="admin"
      homeHref="/admin"
      groups={groups}
      top={
        <Topbar
          firstName={admin.firstName}
          fullName={`${admin.firstName} ${admin.lastName}`}
          sub={ka.enums.platformRole.ADMIN}
          unread={0}
          searchAction="/admin/companies"
          center={<AdminNav groups={groups} />}
          notificationsHref={null}
          profileHref="/admin"
          label={ka.admin.panelBadge}
          searchPlaceholder={ka.top.adminSearch}
        />
      }
    >
      {children}
    </Shell>
  );
}
