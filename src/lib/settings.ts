import "server-only";
import { cache } from "react";
import { db } from "./db";

export type PublicSettings = {
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
};

const DEFAULTS: PublicSettings = { contactEmail: null, contactPhone: null, contactAddress: null };

export const getPublicSettings = cache(async (): Promise<PublicSettings> => {
  const row = await db.platformSetting.findUnique({ where: { key: "public" } });
  return { ...DEFAULTS, ...((row?.value as Partial<PublicSettings> | null) ?? {}) };
});
