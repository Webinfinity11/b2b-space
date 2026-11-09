import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import { ka } from "@/i18n/ka";
import { setUserRoleAction, setUserStatusAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { pageParam, param } from "@/lib/params";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { Table, Td } from "@/components/ui/Table";
import { controlClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: ka.admin.users };

const PER_PAGE = 25;
const ROLES = ["USER", "ADMIN", "FINANCE_MANAGER"] as const;

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const q = param(sp.q);
  const page = pageParam(sp.page);
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      }
    : {};
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { memberships: { where: { status: "ACTIVE" }, include: { company: { select: { legalName: true, tradeName: true } } } } },
    }),
  ]);

  return (
    <>
      <PageHeader title={ka.admin.users} text={ka.catalog.results(total)} />
      <form className="mb-4 flex max-w-md gap-2">
        <input name="q" type="search" defaultValue={q} placeholder={ka.catalog.searchPlaceholder} className={`${controlClass} h-10`} />
      </form>
      {users.length === 0 ? (
        <EmptyState text={ka.common.noData} />
      ) : (
        <Table head={[ka.admin.users, ka.profile.memberships, ka.admin.userRole, ka.admin.userStatus, ka.admin.lastLogin]}>
          {users.map((u) => {
            const self = u.id === admin.id;
            return (
              <tr key={u.id}>
                <Td>
                  <div className="font-medium">{u.firstName} {u.lastName}</div>
                  <div className="text-xs text-muted">{u.email}{u.phone ? ` · ${u.phone}` : ""}</div>
                  <div className="text-xs text-muted">{ka.admin.registered}: {formatDate(u.createdAt)}</div>
                </Td>
                <Td>
                  {u.memberships.length === 0
                    ? <span className="text-muted">{ka.common.none}</span>
                    : u.memberships.map((m) => (
                        <div key={m.id} className="text-xs">
                          {m.company.tradeName || m.company.legalName} <span className="text-muted">({ka.enums.memberRole[m.role]})</span>
                        </div>
                      ))}
                </Td>
                <Td>
                  {self ? (
                    <Badge tone="navy">{ka.enums.platformRole[u.platformRole]}</Badge>
                  ) : (
                    <form action={setUserRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <select name="role" defaultValue={u.platformRole} className={`${controlClass} h-8 w-auto text-xs`}>
                        {ROLES.map((r) => <option key={r} value={r}>{ka.enums.platformRole[r]}</option>)}
                      </select>
                      <Button type="submit" size="sm" variant="secondary">{ka.common.save}</Button>
                    </form>
                  )}
                </Td>
                <Td>
                  <div className="flex flex-col items-start gap-2">
                    <Badge tone={u.status === "ACTIVE" ? "success" : "danger"}>{ka.enums.userStatus[u.status]}</Badge>
                    {!self && (
                      <form action={setUserStatusAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="status" value={u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} />
                        <Button type="submit" size="sm" variant={u.status === "ACTIVE" ? "ghost" : "secondary"} className={u.status === "ACTIVE" ? "text-danger" : ""}>
                          {u.status === "ACTIVE" ? ka.admin.suspend : ka.admin.activate}
                        </Button>
                      </form>
                    )}
                  </div>
                </Td>
                <Td className="whitespace-nowrap text-muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : ka.common.none}</Td>
              </tr>
            );
          })}
        </Table>
      )}
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} basePath="/admin/users" params={{ q }} />
    </>
  );
}
