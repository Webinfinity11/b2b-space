import type { VerificationStatus } from "@/generated/prisma/enums";

/**
 * Companies work immediately after registration — admin verification is optional and only
 * adds the "verified" badge. Only rejected or suspended companies are blocked.
 */
export function companyCanAct(status: VerificationStatus) {
  return status !== "REJECTED" && status !== "SUSPENDED";
}
