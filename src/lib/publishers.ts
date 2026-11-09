import "server-only";
import { ka } from "@/i18n/ka";
import { getMemberships } from "./authz";
import { hasPermission, type Permission } from "./permissions";
import { companyName } from "./public";
import { companyCanAct } from "./company-policy";

/**
 * Identities the user can act as: personally, or any active company where
 * they hold the given permission. Re-checked in the actions.
 */
export async function actingIdentities(userId: string, permission: Permission) {
  const memberships = await getMemberships(userId);
  return [
    { value: "personal", label: ka.offer.asMyself },
    ...memberships
      .filter((m) => companyCanAct(m.company.verificationStatus) && hasPermission(m, permission))
      .map((m) => ({ value: m.companyId, label: companyName(m.company) })),
  ];
}
