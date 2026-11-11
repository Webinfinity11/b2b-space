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
  /** Texts of the legal pages (/terms, /privacy). Empty = "being prepared". */
  termsText: string | null;
  privacyText: string | null;
};

export const SETTINGS_DEFAULTS: PublicSettings = {
  contactEmail: null,
  contactPhone: null,
  contactAddress: null,
  platformLegalName: null,
  platformRegNumber: null,
  platformAddress: null,
  platformIban: null,
  commissionDueDays: 10,
  termsText: null,
  privacyText: null,
};

export const getPublicSettings = cache(async (): Promise<PublicSettings> => {
  const row = await db.platformSetting.findUnique({ where: { key: "public" } });
  return { ...SETTINGS_DEFAULTS, ...((row?.value as Partial<PublicSettings> | null) ?? {}) };
});
