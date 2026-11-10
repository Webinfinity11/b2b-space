import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { deleteBadgeAction, reorderBadgesAction, saveBadgeAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/Card";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/Form";
import { SortableList } from "@/components/ui/SortableList";
import { BADGE_COLORS, BADGE_STYLE } from "@/components/panel/badge-style";

export const metadata: Metadata = { title: ka.sgba.badgesTitle };

type B = { id: string; name: string; description: string | null; color: string; showBanner: boolean; isActive: boolean; _count: { offers: number } };

export default async function AdminBadgesPage() {
  await requireAdmin();
  const badges = await db.offerBadge.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { offers: true } } } });
  const s = ka.sgba;

  return (
    <>
      <PageHeader title={s.badgesTitle} text={s.badgesText} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="h-fit overflow-hidden">
          {badges.length === 0 ? (
            <CardBody><EmptyState text={s.badgeEmpty} /></CardBody>
          ) : (
            <SortableList
              onReorder={reorderBadgesAction}
              items={badges.map((b) => ({
                id: b.id,
                content: (
                  <details className="group py-1">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 py-2 pr-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_STYLE[b.color] ?? BADGE_STYLE.blue}`}>{b.name}</span>
                      {b.showBanner && <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">{s.badgeBanner}</span>}
                      {!b.isActive && <span className="text-xs text-warning">{s.catInactive}</span>}
                      <span className="ml-auto text-xs text-muted">{s.badgeOffers(b._count.offers)}</span>
                      <span className="text-xs font-medium text-accent group-open:hidden">{ka.common.edit}</span>
                    </summary>
                    <div className="mb-3 mr-2 rounded-[12px] bg-surface-2 p-4">
                      <BadgeForm badge={b} />
                      <ActionForm action={deleteBadgeAction} className="mt-3 border-t border-line pt-3">
                        <input type="hidden" name="id" value={b.id} />
                        <SubmitButton size="sm" variant="ghost" className="text-danger">{ka.common.delete}</SubmitButton>
                      </ActionForm>
                    </div>
                  </details>
                ),
              }))}
            />
          )}
        </Card>
        <Card className="h-fit">
          <CardHeader title={s.badgeNew} />
          <CardBody>
            <BadgeForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function BadgeForm({ badge }: { badge?: B }) {
  const s = ka.sgba;
  return (
    <ActionForm action={saveBadgeAction} className="grid gap-3" resetOnSuccess={!badge} toast>
      {badge && <input type="hidden" name="id" value={badge.id} />}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
        <Field label={s.badgeName} name="name"><Input name="name" defaultValue={badge?.name} maxLength={60} required /></Field>
        <Field label={s.badgeColor} name="color"><Select name="color" defaultValue={badge?.color ?? "blue"} options={BADGE_COLORS.map((c) => ({ value: c, label: s.colors[c] }))} /></Field>
      </div>
      <Field label={s.badgeDescription} name="description" optional hint={s.badgeBannerHint}>
        <Textarea name="description" defaultValue={badge?.description} rows={2} maxLength={300} />
      </Field>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Checkbox name="showBanner" defaultChecked={badge?.showBanner ?? false} label={s.badgeBanner} />
        <Checkbox name="isActive" defaultChecked={badge?.isActive ?? true} label={s.catActive} />
      </div>
      <div><SubmitButton size="sm">{ka.common.save}</SubmitButton></div>
    </ActionForm>
  );
}
