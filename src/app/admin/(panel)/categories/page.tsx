import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { deleteCategoryAction, saveCategoryAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton } from "@/components/ui/Form";

export const metadata: Metadata = { title: ka.admin.categories };

type Cat = { id: string; name: string; slug: string; kind: string; sortOrder: number; isActive: boolean; _count: { companies: number; offers: number } };

const KINDS = [
  { value: "OFFER", label: ka.sgba.kindOffer },
  { value: "INDUSTRY", label: ka.sgba.kindIndustry },
];

/** Two flat lists: special-offer categories and company industries. */
export default async function AdminCategoriesPage() {
  await requireAdmin();
  const all = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { companies: true, offers: true } } },
  });

  return (
    <>
      <PageHeader title={ka.admin.categories} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_340px]">
        {KINDS.map((k) => (
          <Card key={k.value} className="h-fit">
            <CardHeader title={k.label} text={String(all.filter((c) => c.kind === k.value).length)} />
            {all
              .filter((c) => c.kind === k.value)
              .map((c) => (
                <div key={c.id} className="border-t border-line first:border-t-0">
                  <CategoryRow cat={c} />
                </div>
              ))}
          </Card>
        ))}
        <Card className="h-fit">
          <CardHeader title={`${ka.common.add}`} />
          <CardBody>
            <CategoryForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function CategoryRow({ cat }: { cat: Cat }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-3">
        <span className="flex items-center gap-2">
          <span className="font-medium">{cat.name}</span>
          {!cat.isActive && <Badge tone="warning">{ka.admin.inactive}</Badge>}
        </span>
        <span className="text-xs text-muted">{cat.kind === "OFFER" ? cat._count.offers : cat._count.companies}</span>
      </summary>
      <div className="border-t border-line bg-canvas/50 px-5 py-4">
        <CategoryForm cat={cat} />
        <ActionForm action={deleteCategoryAction} className="mt-3">
          <input type="hidden" name="id" value={cat.id} />
          <SubmitButton size="sm" variant="ghost" className="text-danger">{ka.common.delete}</SubmitButton>
        </ActionForm>
      </div>
    </details>
  );
}

function CategoryForm({ cat }: { cat?: Cat }) {
  return (
    <ActionForm action={saveCategoryAction} resetOnSuccess={!cat} className="grid gap-3 sm:grid-cols-2">
      {cat && <input type="hidden" name="id" value={cat.id} />}
      <Field label={ka.admin.categoryName} name="name" className="sm:col-span-2">
        <Input name="name" defaultValue={cat?.name} required />
      </Field>
      <Field label={ka.sgba.kind} name="kind">
        <Select name="kind" defaultValue={cat?.kind ?? "OFFER"} options={KINDS} />
      </Field>
      <Field label={ka.admin.sortOrder} name="sortOrder">
        <Input name="sortOrder" type="number" min={0} defaultValue={cat?.sortOrder ?? 0} />
      </Field>
      <div className="sm:col-span-2">
        <Checkbox name="isActive" defaultChecked={cat?.isActive ?? true} label={ka.admin.active} />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton size="sm">{ka.common.save}</SubmitButton>
      </div>
    </ActionForm>
  );
}
