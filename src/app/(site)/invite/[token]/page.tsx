import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ka } from "@/i18n/ka";
import { acceptInvitationAction } from "@/actions/company";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: ka.team.acceptTitle };

/**
 * Invitation link. Not registered → registration with the invite; registered but logged out →
 * login and back here; logged in with the invited email → one click to join.
 */
export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const inv = await db.companyInvitation.findFirst({
    where: { tokenHash: createHash("sha256").update(token).digest("hex"), acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { company: { select: { legalName: true, tradeName: true } } },
  });
  const user = await getCurrentUser();
  if (inv && !user) {
    const registered = await db.user.findUnique({ where: { email: inv.email }, select: { id: true } });
    redirect(registered ? `/login?next=${encodeURIComponent(`/invite/${token}`)}` : `/register?invite=${encodeURIComponent(token)}`);
  }
  const company = inv ? inv.company.tradeName || inv.company.legalName : "";

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-card border border-line bg-card p-6 shadow-card">
        <h1 className="text-xl font-semibold">{ka.team.acceptTitle}</h1>
        {!inv ? (
          <p className="mt-3 text-sm text-muted">{ka.team.inviteInvalid}</p>
        ) : user && user.email.toLowerCase() !== inv.email.toLowerCase() ? (
          <p className="mt-3 text-sm text-muted">{ka.team.acceptWrongEmail(inv.email)}</p>
        ) : (
          <form action={acceptInvitationAction} className="mt-3 space-y-4">
            <p className="text-sm text-secondary">{ka.team.acceptText(company)}</p>
            <p className="text-xs text-muted">{ka.team.role}: {ka.enums.memberRole[inv.role]}</p>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="w-full">{ka.team.acceptButton}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
