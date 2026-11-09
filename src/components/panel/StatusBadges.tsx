import { ka } from "@/i18n/ka";
import type { OfferStatus, ResponseStatus, VerificationStatus } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/Badge";

const verificationTone = {
  PENDING: "warning",
  IN_REVIEW: "info",
  VERIFIED: "success",
  REJECTED: "danger",
  SUSPENDED: "danger",
} as const;

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return <Badge tone={verificationTone[status]}>{ka.enums.verificationStatus[status]}</Badge>;
}

const offerTone = {
  DRAFT: "neutral",
  PUBLISHED: "success",
  ACCEPTING_RESPONSES: "success",
  NEGOTIATING: "info",
  CLOSED: "neutral",
  EXPIRED: "warning",
  ARCHIVED: "neutral",
} as const;

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return <Badge tone={offerTone[status]}>{ka.enums.offerStatus[status]}</Badge>;
}

const responseTone = { SENT: "info", VIEWED: "neutral", ACCEPTED: "success", DECLINED: "danger", WITHDRAWN: "neutral" } as const;

export function ResponseStatusBadge({ status }: { status: ResponseStatus }) {
  return <Badge tone={responseTone[status]}>{ka.enums.responseStatus[status]}</Badge>;
}
