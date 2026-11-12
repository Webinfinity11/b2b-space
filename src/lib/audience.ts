import "server-only";
import { db } from "./db";
import { hasPermission, type Permission } from "./permissions";

/**
 * Company members who should hear about something, by role permission: owners always,
 * plus everyone holding the permission (finance → invoices, HR → team.manage, procurement → purchasing…).
 */
export async function companyAudience(companyId: string, permission: Permission, exclude?: string) {
  const members = await db.companyMember.findMany({
    where: { companyId, status: "ACTIVE" },
    select: { userId: true, role: true, permissions: true },
  });
  return members.filter((m) => hasPermission(m, permission) && m.userId !== exclude).map((m) => m.userId);
}
