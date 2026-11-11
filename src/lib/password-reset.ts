import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");
export const RESET_HOURS = 2;

/** New one-time reset link for a user (older unused links stop working). Returns the path. */
export async function createResetLink(userId: string) {
  const token = randomBytes(24).toString("base64url");
  await db.$transaction([
    db.passwordReset.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }),
    db.passwordReset.create({ data: { userId, tokenHash: hash(token), expiresAt: new Date(Date.now() + RESET_HOURS * 3600_000) } }),
  ]);
  return `/reset-password/${token}`;
}

/** The pending reset for a token, or null if unknown / used / expired. */
export function findReset(token: string) {
  return db.passwordReset.findFirst({
    where: { tokenHash: hash(token), usedAt: null, expiresAt: { gt: new Date() } },
    include: { user: { select: { id: true, email: true, status: true } } },
  });
}
