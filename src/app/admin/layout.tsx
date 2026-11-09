import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { Shell, type NavGroup } from "@/components/panel/Shell";
import { Topbar } from "@/components/panel/Topbar";

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
  const pending = await db.company.count({ where: { verificationStatus: "IN_REVIEW" } });
  const groups: NavGroup[] = [
    { items: [{ href: "/admin", label: ka.admin.overview, icon: "home" }] },
    {
      title: ka.admin.companies,
      items: [
        { href: "/admin/companies", label: ka.admin.companies, badge: pending, icon: "building" },
        { href: "/admin/users", label: ka.admin.users, icon: "users" },
        { href: "/admin/categories", label: ka.admin.categories, icon: "folder" },
      ],
    },
    {
      title: ka.admin.moderation,
      items: [{ href: "/admin/offers", label: ka.admin.offers, icon: "tag" }],
    },
    {
      title: ka.admin.auditLog,
      items: [{ href: "/admin/audit-log", label: ka.admin.auditLog, icon: "list" }],
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
          notificationsHref={null}
          profileHref="/admin"
          subtitle={ka.top.adminSubtitle}
          searchPlaceholder={ka.top.adminSearch}
        />
      }
    >
      {children}
    </Shell>
  );
}
