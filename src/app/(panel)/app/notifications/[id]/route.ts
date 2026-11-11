import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/** Relative redirect — the public host behind the proxy may differ from request.url. */
const go = (path: string) => new Response(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store" } });

/** Opening a notification marks it read, then goes to what it points at. */
export async function GET(_: Request, { params }: RouteContext<"/app/notifications/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return go("/login?next=/app/notifications");
  const n = await db.notification.findFirst({ where: { id, userId: user.id }, select: { link: true, readAt: true } });
  if (n && !n.readAt) await db.notification.update({ where: { id }, data: { readAt: new Date() } });
  // Only same-site paths are followed.
  const target = n?.link && n.link.startsWith("/") && !n.link.startsWith("//") ? n.link : "/app/notifications";
  return go(target);
}
