import type { NotificationType } from "@/generated/prisma/client";

/** Notification topics a user can switch off in their profile (company status changes always arrive). */
export const NOTIFY_TOPICS = ["deals", "purchasing", "finance", "team", "campaigns"] as const;
export type NotifyTopic = (typeof NOTIFY_TOPICS)[number];

export const TOPIC_OF: Record<NotificationType, NotifyTopic | null> = {
  NEW_RESPONSE: "deals",
  NEW_REPLY: "deals",
  NEW_MESSAGE: "deals",
  TERMS_SENT: "deals",
  TERMS_APPROVED: "deals",
  TERMS_REJECTED: "deals",
  MATCHING_OFFER: "purchasing",
  INVOICE_CREATED: "finance",
  PAYMENT_DUE_SOON: "finance",
  INVOICE_OVERDUE: "finance",
  MEMBER_INVITED: "team",
  CAMPAIGN: "campaigns",
  COMPANY_STATUS_CHANGED: null,
};
