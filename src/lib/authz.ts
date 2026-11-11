import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { hasPermission, type Permission } from "./permissions";
import { getCurrentUser, type CurrentUser } from "./session";

export const ACTIVE_COMPANY_COOKIE = "b2b_company";

export class ForbiddenError extends Error {
  constructor() {
    super("FORBIDDEN");
  }
}

/** Page guard: redirects guests to /login. */
export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/** Admin page guard. Guests and non-admins are sent to the admin sign-in. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.platformRole !== "ADMIN") redirect("/admin/login");
  return user;
}

/** Action guard (server actions): throws instead of redirecting. */
export async function assertUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError();
  return user;
}

export async function assertAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.platformRole !== "ADMIN") throw new ForbiddenError();
  return user;
}

export const getMemberships = cache(async (userId: string) => {
  return db.companyMember.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      company: { select: { id: true, slug: true, legalName: true, tradeName: true, logoUrl: true, verificationStatus: true } },
      position: { select: { name: true } },
      department: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
});

export type Membership = Awaited<ReturnType<typeof getMemberships>>[number];

/**
 * The company the user is currently acting for. Taken from a cookie but always re-validated
 * against active memberships, so a forged cookie never grants access.
 */
export const getActiveMembership = cache(async (userId: string): Promise<Membership | null> => {
  const memberships = await getMemberships(userId);
  if (memberships.length === 0) return null;
  const jar = await cookies();
  const wanted = jar.get(ACTIVE_COMPANY_COOKIE)?.value;
  return memberships.find((m) => m.companyId === wanted) ?? memberships[0];
});

/** Page guard for /company/*: requires an active company membership (+ optional permission). */
export async function requireCompany(permission?: Permission | "owner") {
  const user = await requireUser("/company");
  const membership = await getActiveMembership(user.id);
  if (!membership) redirect("/app");
  if (permission === "owner" ? membership.role !== "OWNER" : permission && !hasPermission(membership, permission)) notFound();
  return { user, membership };
}

/** Action guard: the user must be an active member of `companyId` with the permission. */
export async function assertCompanyPermission(companyId: string, permission?: Permission | "owner") {
  const user = await assertUser();
  const member = await db.companyMember.findUnique({
    where: { companyId_userId: { companyId, userId: user.id } },
  });
  if (!member || member.status !== "ACTIVE") throw new ForbiddenError();
  if (permission === "owner" && member.role !== "OWNER") throw new ForbiddenError();
  if (permission && permission !== "owner" && !hasPermission(member, permission)) throw new ForbiddenError();
  return { user, member };
}
