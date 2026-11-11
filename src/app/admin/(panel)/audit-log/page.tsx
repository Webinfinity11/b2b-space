import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { pageParam, param } from "@/lib/params";
import type { Prisma } from "@/generated/prisma/client";
import { controlClass } from "@/components/ui/styles";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { Table, Td } from "@/components/ui/Table";

export const metadata: Metadata = { title: ka.admin.auditLog };

const PER_PAGE = 50;

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  await requireAdmin();
  const sp = await searchParams;
  const page = pageParam(sp.page);
  // Filters: area (action prefix), who did it (email), and from which date.
  const area = param(sp.area);
  const who = param(sp.who);
  const from = param(sp.from);
  const where: Prisma.AuditLogWhereInput = {
    AND: [
      area ? { action: { startsWith: `${area}.` } } : {},
      who ? { actor: { email: { contains: who, mode: "insensitive" } } } : {},
      from && !Number.isNaN(new Date(from).getTime()) ? { createdAt: { gte: new Date(`${from}T00:00:00+04:00`) } } : {},
    ],
  };
  const areas = ["auth", "user", "company", "offer", "response", "conversation", "invoice", "commission", "commission_rule", "campaign", "category", "badge", "report", "settings", "demo"];
  const [total, rows] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { actor: { select: { firstName: true, lastName: true, email: true } } },
    }),
  ]);
  return (
    <>
      <PageHeader title={ka.admin.auditLog} text={ka.catalog.results(total)} />
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="area" defaultValue={area ?? ""} className={`${controlClass} h-10 w-auto`} aria-label={ka.admin.auditArea}>
          <option value="">{ka.admin.auditArea}: {ka.common.all}</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input name="who" type="search" defaultValue={who} placeholder={ka.admin.auditWho} className={`${controlClass} h-10 w-64`} />
        <input name="from" type="date" defaultValue={from} className={`${controlClass} h-10 w-auto`} aria-label={ka.admin.auditFrom} />
        <button type="submit" className="h-10 rounded-[10px] border border-line px-4 text-sm">{ka.catalog.search}</button>
      </form>
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
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} basePath="/admin/audit-log" params={{ area, who, from }} />
    </>
  );
}
