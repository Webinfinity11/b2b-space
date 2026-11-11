import "server-only";
import { cache } from "react";
import { db } from "./db";

export type PublicSettings = {
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  /** Platform legal details printed on SGBA commission invoices. */
  platformLegalName: string | null;
  platformRegNumber: string | null;
  platformAddress: string | null;
  platformIban: string | null;
  /** Days the seller has to pay an SGBA commission invoice. */
  commissionDueDays: number | null;
};

const DEFAULTS: PublicSettings = {
  contactEmail: null,
  contactPhone: null,
  contactAddress: null,
  platformLegalName: null,
  platformRegNumber: null,
  platformAddress: null,
  platformIban: null,
  commissionDueDays: 10,
};

export const getPublicSettings = cache(async (): Promise<PublicSettings> => {
  const row = await db.platformSetting.findUnique({ where: { key: "public" } });
  return { ...DEFAULTS, ...((row?.value as Partial<PublicSettings> | null) ?? {}) };
});
