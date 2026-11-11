import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { addMemberAction, removeMemberAction, revokeInvitationAction, updateMemberAction } from "@/actions/company";
import { Button } from "@/components/ui/Button";
import { requireCompany } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PERMISSIONS } from "@/lib/permissions";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { ActionForm, CheckboxGroup, Field, Input, Select, SubmitButton } from "@/components/ui/Form";
import { getPeopleLists, type PeopleLists } from "@/lib/people";
import { RolePicker } from "@/components/panel/RolePicker";

export const metadata: Metadata = { title: ka.team.title };

const permissionOptions = PERMISSIONS.map((p) => ({ value: p, label: ka.permissions[p] }));

export default async function TeamPage() {
  // Everyone in the company sees the team; only owners manage it.
  const { user, membership } = await requireCompany();
  const isOwner = membership.role === "OWNER";
  const lists = await getPeopleLists();
  const members = await db.companyMember.findMany({
    where: { companyId: membership.companyId, status: "ACTIVE" },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      position: { select: { name: true } },
      department: { select: { name: true } },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
  const invitations = !isOwner ? [] : await db.companyInvitation.findMany({
    where: { companyId: membership.companyId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader title={ka.team.title} text={isOwner ? ka.team.text : ka.team.readOnlyNote} />
      <div className={`grid gap-6 ${isOwner ? "xl:grid-cols-[minmax(0,1fr)_400px]" : ""}`}>
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted">
            {ka.team.members} ({members.length})
          </h2>
          {members.map((m) => (
            <Card key={m.id}>
              <CardBody>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-[#B8D9F1] to-[#5A7F9D] font-bold text-deep">
                      {m.user.firstName.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{m.user.firstName} {m.user.lastName}</span>
                        {m.userId === user.id && <Badge tone="info">{ka.team.you}</Badge>}
                      </div>
                      <p className="text-sm text-secondary">{[m.position?.name, m.department?.name].filter(Boolean).join(" · ") || ka.team.notSet}</p>
                      <p className="text-xs text-muted">{[m.user.email, m.user.phone].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge tone={m.role === "OWNER" ? "navy" : "neutral"}>{ka.enums.memberRole[m.role]}</Badge>
                    <p className="mt-1 text-xs text-muted">{ka.team.joined}: {formatDate(m.createdAt)}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted">{ka.team.roleHelp[m.role]}</p>
                {isOwner && (
                  <details className="mt-3 rounded-lg border border-line">
                    <summary className="cursor-pointer px-3 py-2 text-sm text-accent-strong">{ka.team.edit}</summary>
                    <div className="border-t border-line p-3">
                      <ActionForm action={updateMemberAction} className="space-y-3">
                        <input type="hidden" name="memberId" value={m.id} />
                        <JobFields lists={lists} position={m.positionId} department={m.departmentId} />
                        <RolePicker name="role" defaultValue={m.role} idPrefix={m.id} />
                        <details className="rounded-lg bg-canvas p-3">
                          <summary className="cursor-pointer text-xs text-muted">{ka.team.customPermissions}</summary>
                          <p className="my-2 text-xs text-muted">{ka.team.customHint}</p>
                          <CheckboxGroup name="permissions" options={permissionOptions} defaultValues={m.role === "OWNER" ? [] : m.permissions} columns={1} />
                        </details>
                        <SubmitButton size="sm">{ka.common.save}</SubmitButton>
                      </ActionForm>
                      {m.userId !== user.id && <ActionForm action={removeMemberAction} className="mt-3 border-t border-line pt-3">
                        <input type="hidden" name="memberId" value={m.id} />
                        <SubmitButton size="sm" variant="ghost" className="text-danger">{ka.common.remove}</SubmitButton>
                      </ActionForm>}
                    </div>
                  </details>
                )}
              </CardBody>
            </Card>
          ))}

          {invitations.length > 0 && (
            <Card>
              <CardHeader title={`${ka.team.pendingTitle} (${invitations.length})`} text={ka.team.pendingHint} />
              <CardBody>
                <ul className="divide-y divide-line">
                  {invitations.map((inv) => (
                    <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                      <span className="text-sm">
                        <span className="font-medium">{[inv.firstName, inv.lastName].filter(Boolean).join(" ") || inv.email}</span>
                        {(inv.firstName || inv.lastName) && <span className="text-muted"> · {inv.email}</span>}
                        <span className="text-muted"> · {ka.enums.memberRole[inv.role]} · {ka.team.expires}: {formatDate(inv.expiresAt)}</span>
                      </span>
                      <form action={revokeInvitationAction}>
                        <input type="hidden" name="invitationId" value={inv.id} />
                        <Button type="submit" size="sm" variant="ghost" className="text-danger">{ka.team.revoke}</Button>
                      </form>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>

        {isOwner && <div className="space-y-4">
          <Card className="h-fit border-accent/50">
            <CardHeader title={ka.team.add} />
            <CardBody className="space-y-4">
              <p className="text-sm font-medium">{ka.team.stepsTitle}</p>
              <ol className="space-y-2 rounded-lg bg-canvas p-3 text-sm">
                {ka.team.steps.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-on-accent">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <ActionForm action={addMemberAction} resetOnSuccess className="space-y-4">
                <input type="hidden" name="companyId" value={membership.companyId} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label={ka.team.firstName} name="firstName" optional>
                    <Input name="firstName" maxLength={60} />
                  </Field>
                  <Field label={ka.team.lastName} name="lastName" optional>
                    <Input name="lastName" maxLength={60} />
                  </Field>
                </div>
                <Field label={ka.auth.email} name="email">
                  <Input name="email" type="email" placeholder="name@company.ge" required />
                </Field>
                <JobFields lists={lists} />
                <Field label={ka.team.role} name="role">
                  <RolePicker name="role" defaultValue="EMPLOYEE" idPrefix="new" />
                </Field>
                <details className="rounded-lg bg-canvas p-3">
                  <summary className="cursor-pointer text-xs text-muted">{ka.team.customPermissions}</summary>
                  <p className="my-2 text-xs text-muted">{ka.team.customHint}</p>
                  <CheckboxGroup name="permissions" options={permissionOptions} defaultValues={[]} columns={1} />
                </details>
                <SubmitButton className="w-full" size="lg">{ka.common.add}</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        </div>}
      </div>
    </>
  );
}

/** Position and department from the admin-managed lists — no free text, so campaigns can target them. */
function JobFields({ lists, position, department }: { lists: PeopleLists; position?: string | null; department?: string | null }) {
  return (
    <div className="space-y-3">
      <Field label={ka.team.position} name="positionId" optional>
        <Select name="positionId" defaultValue={position ?? ""} placeholder={ka.team.choosePosition} options={lists.positions.map((p) => ({ value: p.id, label: p.name }))} />
      </Field>
      <Field label={ka.team.department} name="departmentId" optional hint={ka.team.listHint}>
        <Select name="departmentId" defaultValue={department ?? ""} placeholder={ka.team.chooseDepartment} options={lists.departments.map((p) => ({ value: p.id, label: p.name }))} />
      </Field>
    </div>
  );
}
