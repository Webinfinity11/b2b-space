import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { pageParam } from "@/lib/params";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { Table, Td } from "@/components/ui/Table";

export const metadata: Metadata = { title: ka.admin.auditLog };

const PER_PAGE = 50;

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  await requireAdmin();
  const page = pageParam((await searchParams).page);
  const [total, rows] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { actor: { select: { firstName: true, lastName: true, email: true } } },
    }),
  ]);
  return (
    <>
      <PageHeader title={ka.admin.auditLog} text={ka.catalog.results(total)} />
      {rows.length === 0 ? (
        <EmptyState text={ka.common.noData} />
      ) : (
        <Table head={[ka.common.date, ka.admin.auditActor, ka.admin.auditAction, ka.admin.auditEntity, ka.admin.auditDetails]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td className="whitespace-nowrap text-muted">{formatDateTime(r.createdAt)}</Td>
              <Td>
                {r.actor ? (
                  <>
                    {r.actor.firstName} {r.actor.lastName}
                    <div className="text-xs text-muted">{r.actor.email}</div>
                  </>
                ) : (
                  <span className="text-muted">{ka.admin.system}</span>
                )}
                {r.ip && <div className="text-xs text-muted">IP: {r.ip}</div>}
              </Td>
              <Td>{ka.audit[r.action] ?? r.action}</Td>
              <Td className="text-xs">
                {r.entityType}
                {r.entityId && <div className="font-mono text-muted">{r.entityId}</div>}
              </Td>
              <Td>
                {r.metadata ? <pre className="max-w-xs overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] text-muted">{JSON.stringify(r.metadata, null, 1)}</pre> : null}
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} basePath="/admin/audit-log" params={{}} />
    </>
  );
}
