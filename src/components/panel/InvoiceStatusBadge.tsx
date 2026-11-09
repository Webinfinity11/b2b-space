import { ka } from "@/i18n/ka";
import type { InvoiceStatus } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/Badge";

const tone: Record<InvoiceStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  DRAFT: "neutral",
  ISSUED: "info",
  SENT: "info",
  VIEWED: "info",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "danger",
  CANCELLED: "neutral",
  REFUNDED: "neutral",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge tone={tone[status]}>{ka.enums.invoiceStatus[status]}</Badge>;
}
