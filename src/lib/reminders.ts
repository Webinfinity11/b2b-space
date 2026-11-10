import "server-only";
import { ka } from "@/i18n/ka";
import { db } from "./db";
import { notify } from "./notify";
import { invoiceSideUserIds as sideUsers } from "./invoices";

const OPEN = ["ISSUED", "SENT", "VIEWED", "PARTIALLY_PAID"] as const;
const DAY = 864e5;

/** Sends a notification once per (user, type, invoice) — repeated runs are safe. */
async function once(userIds: string[], type: "PAYMENT_DUE_SOON" | "INVOICE_OVERDUE", title: string, link: string) {
  const already = await db.notification.findMany({ where: { userId: { in: userIds }, type, link }, select: { userId: true } });
  const sent = new Set(already.map((a) => a.userId));
  await notify(userIds.filter((u) => !sent.has(u)), { type, title, link });
}

/**
 * Due-soon (≤ 3 days) and overdue reminders for unpaid invoices. Status itself is not changed:
 * "overdue" is computed for display, payments are only ever recorded by people.
 */
export async function runInvoiceReminders(now = new Date()) {
  const invoices = await db.invoice.findMany({
    where: { status: { in: [...OPEN] }, dueDate: { not: null, lte: new Date(now.getTime() + 3 * DAY) } },
    select: { id: true, number: true, dueDate: true, sellerCompanyId: true, sellerUserId: true, buyerCompanyId: true, buyerUserId: true },
  });
  let count = 0;
  for (const inv of invoices) {
    const link = `/app/invoices/${inv.id}`;
    const buyers = await sideUsers(inv.buyerCompanyId, inv.buyerUserId);
    if (inv.dueDate! < now) {
      const sellers = await sideUsers(inv.sellerCompanyId, inv.sellerUserId);
      await once([...buyers, ...sellers], "INVOICE_OVERDUE", ka.invoice.notifyOverdue(inv.number), link);
    } else {
      await once(buyers, "PAYMENT_DUE_SOON", ka.invoice.notifyDueSoon(inv.number), link);
    }
    count++;
  }
  return count;
}
