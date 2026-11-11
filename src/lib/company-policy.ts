import type { VerificationStatus } from "@/generated/prisma/enums";

/**
 * Admin approval of a registration verifies the company, so "approved" and "verified" are the
 * same thing. One rule everywhere: only a VERIFIED company is listed, can be contacted and can act.
 * (Pending / in-review / rejected / suspended companies are hidden and read-only.)
 */
export function companyCanAct(status: VerificationStatus) {
  return status === "VERIFIED";
}
