import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { ka } from "@/i18n/ka";
import { adminResetLinkAction, adminUpdateUserAction, clearRejectedUserAction, setUserRoleAction, setUserStatusAction } from "@/actions/admin";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";
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
const ROLES = ["USER", "ADMIN"] as const;

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const q = param(sp.q);
  const page = pageParam(sp.page);
  const st = param(sp.status);
  const status = st === "PENDING" || st === "ACTIVE" || st === "SUSPENDED" || st === "REJECTED" ? st : undefined;
  const search: Prisma.UserWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      }
    : {};
  const where: Prisma.UserWhereInput = status ? { AND: [search, { status }] } : search;
  const [total, users, pendingCount] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { memberships: { where: { status: "ACTIVE" }, include: { company: { select: { legalName: true, tradeName: true } } } } },
    }),
    db.user.count({ where: { status: "PENDING" } }),
  ]);
  const tabs = [
    { value: undefined, label: ka.approval.all },
    { value: "PENDING", label: `${ka.enums.userStatus.PENDING}${pendingCount ? ` (${pendingCount})` : ""}` },
    { value: "ACTIVE", label: ka.enums.userStatus.ACTIVE },
    { value: "SUSPENDED", label: ka.enums.userStatus.SUSPENDED },
    { value: "REJECTED", label: ka.enums.userStatus.REJECTED },
  ] as const;
  const tone = (s: string) => (s === "ACTIVE" ? "success" : s === "PENDING" ? "warning" : "danger") as "success" | "warning" | "danger";

  return (
    <>
      <PageHeader title={ka.admin.users} text={pendingCount ? ka.approval.pendingText(pendingCount) : ka.catalog.results(total)} />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = t.value === status;
          const p = new URLSearchParams();
          if (t.value) p.set("status", t.value);
          if (q) p.set("q", q);
          return (
            <Link
              key={t.label}
              href={`/admin/users${p.size ? `?${p}` : ""}`}
              className={`rounded-full border px-3.5 py-1.5 text-sm ${active ? "border-accent bg-accent/10 font-semibold text-accent-strong" : "border-line bg-surface text-secondary hover:text-ink"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <form className="mb-4 flex max-w-md gap-2">
        {status && <input type="hidden" name="status" value={status} />}
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
                  {!self && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-accent-strong">{ka.admin.editUser}</summary>
                      <div className="mt-2 w-72 space-y-3 rounded-lg border border-line p-3">
                        <ActionForm action={adminUpdateUserAction} toast className="space-y-2">
                          <input type="hidden" name="userId" value={u.id} />
                          <div className="grid grid-cols-2 gap-2">
                            <Field label={ka.auth.firstName} name="firstName"><Input name="firstName" defaultValue={u.firstName} required className="h-9" /></Field>
                            <Field label={ka.auth.lastName} name="lastName"><Input name="lastName" defaultValue={u.lastName} required className="h-9" /></Field>
                          </div>
                          <Field label={ka.auth.email} name="email"><Input name="email" type="email" defaultValue={u.email} required className="h-9" /></Field>
                          <Field label={ka.auth.phone} name="phone" optional><Input name="phone" defaultValue={u.phone ?? ""} className="h-9" /></Field>
                          <SubmitButton size="sm">{ka.common.save}</SubmitButton>
                        </ActionForm>
                        {u.status === "ACTIVE" && (
                          <ActionForm action={adminResetLinkAction} className="border-t border-line pt-3">
                            <input type="hidden" name="userId" value={u.id} />
                            <SubmitButton size="sm" variant="secondary">{ka.reset.adminButton}</SubmitButton>
                          </ActionForm>
                        )}
                        {u.status === "REJECTED" && !u.email.endsWith("@removed.invalid") && (
                          <form action={clearRejectedUserAction} className="border-t border-line pt-3">
                            <input type="hidden" name="userId" value={u.id} />
                            <p className="mb-2 text-xs text-muted">{ka.admin.clearRejectedHint}</p>
                            <Button type="submit" size="sm" variant="ghost" className="text-danger">{ka.admin.clearRejected}</Button>
                          </form>
                        )}
                      </div>
                    </details>
                  )}
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
                    <Badge tone={tone(u.status)}>{ka.enums.userStatus[u.status]}</Badge>
                    {!self && u.status === "PENDING" ? (
                      <div className="flex flex-wrap gap-2">
                        <form action={setUserStatusAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="status" value="ACTIVE" />
                          <Button type="submit" size="sm">{ka.approval.approve}</Button>
                        </form>
                        <details>
                          <summary className="cursor-pointer text-sm text-danger">{ka.approval.reject}</summary>
                          <form action={setUserStatusAction} className="mt-2 space-y-2">
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="hidden" name="status" value="REJECTED" />
                            <input name="reason" required minLength={3} placeholder={ka.admin.rejectReason} className={`${controlClass} h-9 text-xs`} />
                            <Button type="submit" size="sm" variant="danger">{ka.approval.reject}</Button>
                          </form>
                        </details>
                      </div>
                    ) : !self && (
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
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} basePath="/admin/users" params={{ q, status }} />
    </>
  );
}
