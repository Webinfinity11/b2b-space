import { ka } from "@/i18n/ka";
import type { PlatformRole, VerificationStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/format";
import { VerificationBadge } from "./StatusBadges";

type Decision = {
  id: string;
  fromStatus: VerificationStatus;
  toStatus: VerificationStatus;
  comment: string | null;
  createdAt: Date;
  reviewer: { firstName: string; lastName: string; platformRole: PlatformRole };
};

export function VerificationHistory({ decisions }: { decisions: Decision[] }) {
  if (decisions.length === 0) return <p className="text-sm text-muted">{ka.verification.noHistory}</p>;
  return (
    <ol className="space-y-4">
      {decisions.map((d) => (
        <li key={d.id} className="border-l-2 border-accent pl-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <VerificationBadge status={d.fromStatus} />
            <span aria-hidden="true" className="text-muted">→</span>
            <VerificationBadge status={d.toStatus} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {formatDateTime(d.createdAt)} · {d.reviewer.firstName} {d.reviewer.lastName}
            {d.reviewer.platformRole === "ADMIN" ? ` (${ka.enums.platformRole.ADMIN})` : ""}
          </p>
          {d.comment && <p className="mt-1.5 whitespace-pre-line rounded-lg bg-canvas px-3 py-2 text-sm">{d.comment}</p>}
        </li>
      ))}
    </ol>
  );
}
