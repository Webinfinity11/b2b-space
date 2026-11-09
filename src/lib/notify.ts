import "server-only";
import type { NotificationType } from "@/generated/prisma/client";
import { db } from "./db";

/**
 * Creates in-app notifications. Email delivery will plug in here later (separate stage),
 * so callers don't need to change.
 */
export async function notify(
  userIds: string[],
  n: { type: NotificationType; title: string; body?: string; link?: string },
) {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return;
  await db.notification.createMany({
    data: unique.map((userId) => ({ userId, type: n.type, title: n.title, body: n.body, link: n.link })),
  });
}
