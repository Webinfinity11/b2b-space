import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { deleteCategoryAction, reorderCategoriesAction, saveCategoryAction, toggleCategoryAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { param } from "@/lib/params";
import { Card, PageHeader } from "@/components/ui/Card";
import { ActionForm, Input, Select, SubmitButton } from "@/components/ui/Form";
import { ListSearch } from "@/components/ui/ListSearch";
import { SortableList } from "@/components/ui/SortableList";

export const metadata: Metadata = { title: ka.admin.categories };

/**
 * Two flat lists (special-offer categories / company industries): drag to reorder, rename inline,
 * switch on/off, delete with moving companies & offers to another category.
 */
export default async function AdminCategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  await requireAdmin();
  const KINDS = ["OFFER", "INDUSTRY", "POSITION", "DEPARTMENT"] as const;
  const wanted = param((await searchParams).kind);
  const kind = KINDS.find((k) => k === wanted) ?? "OFFER";
  const [all, counts] = await Promise.all([
    db.category.findMany({
      where: { kind },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { companies: true, offers: true, positionMembers: true, departmentMembers: true } } },
    }),
    db.category.groupBy({ by: ["kind"], _count: true }),
  ]);
  const s = ka.sgba;
  const tabs = [
    { value: "OFFER", label: s.kindOffer },
    { value: "INDUSTRY", label: s.kindIndustry },
    { value: "POSITION", label: s.kindPosition },
    { value: "DEPARTMENT", label: s.kindDepartment },
  ];
  const count = (k: string) => counts.find((c) => c.kind === k)?._count ?? 0;

  return (
    <>
      <PageHeader title={s.catTitle} text={s.catText} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-[12px] bg-surface-2 p-1">
          {tabs.map((t) => (
            <Link
              key={t.value}
              href={`/admin/categories?kind=${t.value}`}
              className={`rounded-[10px] px-4 py-2 text-sm font-bold ${kind === t.value ? "bg-surface text-ink shadow-[0_2px_8px_rgb(33_55_105/0.08)]" : "text-muted hover:text-ink"}`}
            >
              {t.label} <span className="ml-1 text-xs font-normal text-muted">{count(t.value)}</span>
            </Link>
          ))}
        </div>
        <ListSearch targetId="cat-list" placeholder={s.catSearch} />
      </div>

      <Card className="overflow-hidden">
        <ActionForm action={saveCategoryAction} resetOnSuccess toast className="flex flex-wrap items-start gap-2 border-b border-line p-4">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="isActive" value="on" />
          <input type="hidden" name="sortOrder" value={String((all.at(-1)?.sortOrder ?? 0) + 10)} />
          <div className="min-w-0 flex-1">
            <Input name="name" placeholder={s.catAddPlaceholder} required maxLength={80} />
          </div>
          <SubmitButton>+ {s.catAdd}</SubmitButton>
        </ActionForm>

        <div id="cat-list">
          <SortableList
            onReorder={reorderCategoriesAction}
            items={all.map((c) => {
              const members = c._count.positionMembers + c._count.departmentMembers;
              const used = c.kind === "OFFER" ? c._count.offers : c.kind === "INDUSTRY" ? c._count.companies : members;
              const others = all.filter((x) => x.id !== c.id).map((x) => ({ value: x.id, label: x.name }));
              return {
                id: c.id,
                content: (
                  <details className="group" data-search={c.name}>
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 py-3 pr-2">
                      <span className={`font-medium ${c.isActive ? "text-ink" : "text-muted line-through"}`}>{c.name}</span>
                      <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] text-secondary">
                        {c.kind === "OFFER" ? s.catUsedOffers(c._count.offers) : c.kind === "INDUSTRY" ? s.catUsedCompanies(c._count.companies) : s.catUsedMembers(members)}
                      </span>
                      <span className="ml-auto text-xs font-medium text-accent group-open:hidden">{ka.common.edit}</span>
                    </summary>
                    <div className="mb-3 mr-2 grid gap-4 rounded-[12px] bg-surface-2 p-4 lg:grid-cols-2">
                      <ActionForm action={saveCategoryAction} className="space-y-2" toast>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="kind" value={c.kind} />
                        <input type="hidden" name="sortOrder" value={String(c.sortOrder)} />
                        {c.isActive && <input type="hidden" name="isActive" value="on" />}
                        <label className="block text-xs text-muted" htmlFor={`n-${c.id}`}>{s.catRename}</label>
                        <div className="flex gap-2">
                          <Input id={`n-${c.id}`} name="name" defaultValue={c.name} required maxLength={80} />
                          <SubmitButton size="sm" variant="secondary">{ka.common.save}</SubmitButton>
                        </div>
                      </ActionForm>
                      <div className="space-y-2">
                        <form action={toggleCategoryAction.bind(null, c.id)}>
                          <button type="submit" className={`h-9 rounded-[10px] border px-3 text-xs font-bold ${c.isActive ? "border-line-strong bg-surface text-ink" : "border-accent bg-accent text-white"}`}>
                            {c.isActive ? s.catTurnOff : s.catTurnOn}
                          </button>
                        </form>
                        <ActionForm action={deleteCategoryAction} className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="id" value={c.id} />
                          {used > 0 && (
                            <div className="min-w-0 flex-1">
                              <label className="mb-1 block text-xs text-muted" htmlFor={`m-${c.id}`}>{s.catMoveTo}</label>
                              <Select id={`m-${c.id}`} name="moveTo" placeholder={s.catMoveNone} options={others} />
                            </div>
                          )}
                          <SubmitButton size="sm" variant="ghost" className="text-danger">{ka.common.delete}</SubmitButton>
                        </ActionForm>
                      </div>
                    </div>
                  </details>
                ),
              };
            })}
          />
        </div>
      </Card>
    </>
  );
}
