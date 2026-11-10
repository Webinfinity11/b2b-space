import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { setUserStatusAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, PageHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: ka.sgba.approvalsTitle };

/** Company registrations waiting for an administrator's decision. */
export default async function RegistrationsPage() {
  await requireAdmin();
  const users = await db.user.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      createdCompanies: {
        select: {
          id: true, legalName: true, registrationNumber: true, city: true, legalAddress: true, businessRole: true, size: true, direction: true,
          categories: { select: { category: { select: { name: true } } } },
        },
      },
    },
  });

  return (
    <>
      <PageHeader title={ka.sgba.approvalsTitle} text={ka.sgba.approvalsText} />
      {users.length === 0 ? (
        <EmptyState text={ka.sgba.approvalsEmpty} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {users.map((u) => {
            const c = u.createdCompanies[0];
            return (
              <Card key={u.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-ink">{c?.legalName ?? `${u.firstName} ${u.lastName}`}</div>
                    {c && <div className="text-sm text-muted">{ka.companyForm.registrationNumber}: {c.registrationNumber}</div>}
                  </div>
                  <Badge tone="warning">{ka.enums.userStatus.PENDING}</Badge>
                </div>
                {c && (
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <Item label={ka.sgba.industry} value={c.categories.map((x) => x.category.name).join(", ") || "—"} />
                    <Item label={ka.sgba.city} value={c.city ?? "—"} />
                    <Item label={ka.sgba.role} value={ka.sgba.roles[c.businessRole]} />
                    <Item label={ka.sgba.size} value={ka.sgba.sizeFull[c.size]} />
                    <Item label={ka.sgba.direction} value={c.direction || "—"} />
                    <Item label={ka.sgba.legalAddressOptional} value={c.legalAddress || "—"} />
                  </dl>
                )}
                <div className="mt-4 rounded-[10px] bg-canvas px-3 py-2.5 text-sm">
                  <div className="text-xs text-muted">{ka.sgba.applicant}</div>
                  <div className="font-medium">{u.firstName} {u.lastName}</div>
                  <div className="text-muted">{u.email}{u.phone ? ` · ${u.phone}` : ""}</div>
                  <div className="mt-1 text-xs text-muted">{ka.sgba.submitted}: {formatDateTime(u.createdAt)}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={setUserStatusAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="status" value="ACTIVE" />
                    <Button type="submit">{ka.sgba.approveCompany}</Button>
                  </form>
                  <form action={setUserStatusAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="status" value="REJECTED" />
                    <Button type="submit" variant="ghost" className="text-danger">{ka.sgba.rejectCompany}</Button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}
