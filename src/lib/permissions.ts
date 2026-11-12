import type { MemberRole } from "@/generated/prisma/client";

export const PERMISSIONS = [
  "company.edit",
  "offers.manage",
  "responses.manage",
  "terms.manage",
  "purchasing",
  "invoices.view",
  "invoices.manage",
  "finance.view",
  "team.manage",
  "campaigns.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Company roles in display order. */
export const MEMBER_ROLES = ["OWNER", "PROCUREMENT", "SALES", "FINANCE", "HR", "MARKETING", "EMPLOYEE"] as const satisfies readonly MemberRole[];

/**
 * Default permissions per role. Permissions also decide who in a company receives which
 * notifications (see src/lib/audience.ts): finance → invoices, HR → team, procurement → matching offers…
 */
export const DEFAULT_PERMISSIONS: Record<MemberRole, Permission[]> = {
  OWNER: [...PERMISSIONS],
  PROCUREMENT: ["purchasing", "offers.manage", "responses.manage", "terms.manage", "invoices.view"],
  SALES: ["offers.manage", "responses.manage", "terms.manage", "invoices.view"],
  FINANCE: ["invoices.view", "invoices.manage", "finance.view"],
  HR: ["team.manage"],
  MARKETING: ["campaigns.manage", "offers.manage", "company.edit"],
  EMPLOYEE: ["offers.manage", "responses.manage"],
};

export function hasPermission(member: { role: MemberRole; permissions: string[] }, permission: Permission) {
  return member.role === "OWNER" || member.permissions.includes(permission);
}

export function sanitizePermissions(values: string[]): Permission[] {
  return PERMISSIONS.filter((p) => values.includes(p));
}
