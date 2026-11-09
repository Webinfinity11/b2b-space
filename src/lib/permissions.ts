import type { MemberRole } from "@/generated/prisma/client";

export const PERMISSIONS = [
  "company.edit",
  "offers.manage",
  "responses.manage",
  "terms.manage",
  "invoices.view",
  "invoices.manage",
  "finance.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Default permissions suggested when adding a member with a given role. */
export const DEFAULT_PERMISSIONS: Record<MemberRole, Permission[]> = {
  OWNER: [...PERMISSIONS],
  EMPLOYEE: ["offers.manage", "responses.manage"],
  FINANCE: ["invoices.view", "invoices.manage", "finance.view"],
};

export function hasPermission(member: { role: MemberRole; permissions: string[] }, permission: Permission) {
  return member.role === "OWNER" || member.permissions.includes(permission);
}

export function sanitizePermissions(values: string[]): Permission[] {
  return PERMISSIONS.filter((p) => values.includes(p));
}
