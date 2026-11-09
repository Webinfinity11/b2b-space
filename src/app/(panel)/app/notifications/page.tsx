import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { markNotificationsReadAction } from "@/actions/panel";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, PageHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: ka.panel.notifications };

export default async function NotificationsPage() {
  const user = await requireUser("/app/notifications");
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = items.some((n) => !n.readAt);
  return (
    <>
      <PageHeader
        title={ka.panel.notifications}
        action={
          unread ? (
            <form action={markNotificationsReadAction}>
              <Button type="submit" variant="secondary" size="sm">{ka.panel.markAllRead}</Button>
            </form>
          ) : null
        }
      />
      {items.length === 0 ? (
        <EmptyState text={ka.panel.noNotifications} />
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {items.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 px-5 py-4 ${n.readAt ? "" : "bg-accent/5"}`}>
                <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-line" : "bg-accent-strong"}`} />
                <div className="min-w-0">
                  {n.link ? (
                    <Link href={n.link} className="text-sm font-medium hover:underline">{n.title}</Link>
                  ) : (
                    <p className="text-sm font-medium">{n.title}</p>
                  )}
                  {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted">{formatDateTime(n.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
