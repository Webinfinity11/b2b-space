import "server-only";
import { after } from "next/server";
import { ka } from "@/i18n/ka";
import type { NotificationType } from "@/generated/prisma/client";
import { db } from "./db";
import { emailEnabled, renderEmail, sendEmail } from "./email";
import { TOPIC_OF } from "./notify-topics";

/**
 * Creates in-app notifications and (after the response is sent) emails the same text
 * to users who keep email notifications on.
 */
export async function notify(
  userIds: string[],
  n: { type: NotificationType; title: string; body?: string; link?: string },
) {
  let unique = [...new Set(userIds)];
  if (unique.length === 0) return;

  // Users who switched this topic off in their profile get nothing (neither in-app nor email).
  const topic = TOPIC_OF[n.type];
  if (topic) {
    const muted = await db.user.findMany({ where: { id: { in: unique }, mutedTopics: { has: topic } }, select: { id: true } });
    const mutedIds = new Set(muted.map((u) => u.id));
    unique = unique.filter((id) => !mutedIds.has(id));
    if (unique.length === 0) return;
  }

  // Chat messages: email only for the first unread message per conversation (no flood).
  let skipEmail = new Set<string>();
  if (n.type === "NEW_MESSAGE" && n.link) {
    const pending = await db.notification.findMany({
      where: { userId: { in: unique }, type: n.type, link: n.link, readAt: null },
      select: { userId: true },
    });
    skipEmail = new Set(pending.map((p) => p.userId));
  }

  await db.notification.createMany({
    data: unique.map((userId) => ({ userId, type: n.type, title: n.title, body: n.body, link: n.link })),
  });

  const emailTo = unique.filter((id) => !skipEmail.has(id));
  if (emailTo.length === 0 || !emailEnabled()) return;
  const job = async () => {
    const users = await db.user.findMany({
      where: { id: { in: emailTo }, status: "ACTIVE", emailNotifications: true },
      select: { email: true },
    });
    const { html, text } = renderEmail({ title: n.title, body: n.body, link: n.link, button: ka.email.open, footer: ka.email.footer });
    for (const u of users) await sendEmail({ to: u.email, subject: n.title, html, text });
  };
  try {
    after(job); // inside a request: send after the response
  } catch {
    await job(); // background job (no request scope)
  }
}
