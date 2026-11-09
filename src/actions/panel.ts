"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACTIVE_COMPANY_COOKIE, assertUser, getMemberships } from "@/lib/authz";
import { db } from "@/lib/db";

export async function switchCompanyAction(formData: FormData) {
  const user = await assertUser();
  const companyId = String(formData.get("companyId") ?? "");
  const memberships = await getMemberships(user.id);
  if (!memberships.some((m) => m.companyId === companyId)) return;
  const jar = await cookies();
  jar.set(ACTIVE_COMPANY_COOKIE, companyId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

export async function markNotificationsReadAction() {
  const user = await assertUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/app", "layout");
}
