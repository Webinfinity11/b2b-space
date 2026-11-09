import "server-only";
import { ka } from "@/i18n/ka";
import type { ParticipantSide } from "@/generated/prisma/enums";
import { companyName } from "./public";

type Party = {
  userId: string;
  side: ParticipantSide;
  identityRevealed: boolean;
  user: { firstName: string; lastName: string };
  company: { legalName: string; tradeName: string | null } | null;
};

/**
 * How a participant is shown to the viewer. The other side of an anonymous request
 * only ever sees "anonymous party" — names are resolved here, on the server.
 */
export function partyLabel(p: Party, viewerSide: ParticipantSide | null, viewerId: string) {
  if (p.userId === viewerId) return ka.chat.you;
  if (viewerSide !== p.side && !p.identityRevealed) return ka.chat.anonymousParty;
  const person = `${p.user.firstName} ${p.user.lastName}`;
  return p.company ? `${person} · ${companyName(p.company)}` : person;
}

export function otherPartyLabel(parties: Party[], viewerSide: ParticipantSide | null) {
  const other = parties.find((p) => p.side !== viewerSide);
  if (!other) return ka.common.none;
  if (!other.identityRevealed) return ka.chat.anonymousParty;
  return other.company ? companyName(other.company) : `${other.user.firstName} ${other.user.lastName}`;
}

export const partySelect = {
  userId: true,
  side: true,
  identityRevealed: true,
  companyId: true,
  lastReadAt: true,
  user: { select: { firstName: true, lastName: true } },
  company: { select: { legalName: true, tradeName: true } },
} as const;
