import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { deleteCategoryAction, saveCategoryAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton } from "@/components/ui/Form";

export const metadata: Metadata = { title: ka.admin.categories };

type Cat = { id: string; name: string; slug: string; parentId: string | null; sortOrder: number; isActive: boolean; _count: { companies: number; offers: number } };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const all = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { companies: true, offers: true } } },
  });
  const roots = all.filter((c) => !c.parentId);
  const parentOptions = roots.map((r) => ({ value: r.id, label: r.name }));

  return (
    <>
      <PageHeader title={ka.admin.categories} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          {roots.map((root) => (
            <Card key={root.id}>
              <CategoryRow cat={root} parentOptions={parentOptions} />
              {all.filter((c) => c.parentId === root.id).map((child) => (
                <div key={child.id} className="border-t border-line pl-6">
                  <CategoryRow cat={child} parentOptions={parentOptions} />
                </div>
              ))}
            </Card>
          ))}
        </div>
        <Card className="h-fit">
          <CardHeader title={`${ka.common.add}: ${ka.admin.categories}`} />
          <CardBody>
            <CategoryForm parentOptions={parentOptions} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function CategoryRow({ cat, parentOptions }: { cat: Cat; parentOptions: { value: string; label: string }[] }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-3">
        <span className="flex items-center gap-2">
          <span className="font-medium">{cat.name}</span>
          <span className="text-xs text-muted">/{cat.slug}</span>
          {!cat.isActive && <Badge tone="warning">{ka.admin.inactive}</Badge>}
        </span>
        <span className="text-xs text-muted">
          {ka.nav.companies}: {cat._count.companies} · {ka.nav.offers}: {cat._count.offers}
        </span>
      </summary>
      <div className="border-t border-line bg-canvas/50 px-5 py-4">
        <CategoryForm cat={cat} parentOptions={parentOptions.filter((p) => p.value !== cat.id)} />
        <ActionForm action={deleteCategoryAction} className="mt-3">
          <input type="hidden" name="id" value={cat.id} />
          <SubmitButton size="sm" variant="ghost" className="text-danger">{ka.common.delete}</SubmitButton>
        </ActionForm>
      </div>
    </details>
  );
}

function CategoryForm({ cat, parentOptions }: { cat?: Cat; parentOptions: { value: string; label: string }[] }) {
  return (
    <ActionForm action={saveCategoryAction} resetOnSuccess={!cat} className="grid gap-3 sm:grid-cols-2">
      {cat && <input type="hidden" name="id" value={cat.id} />}
      <Field label={ka.admin.categoryName} name="name" className="sm:col-span-2">
        <Input name="name" defaultValue={cat?.name} required />
      </Field>
      <Field label={ka.admin.categorySlug} name="slug" optional>
        <Input name="slug" defaultValue={cat?.slug} />
      </Field>
      <Field label={ka.admin.sortOrder} name="sortOrder">
        <Input name="sortOrder" type="number" min={0} defaultValue={cat?.sortOrder ?? 0} />
      </Field>
      <Field label={ka.admin.parentCategory} name="parentId" className="sm:col-span-2">
        <Select name="parentId" defaultValue={cat?.parentId ?? ""} placeholder={ka.admin.noParent} options={parentOptions} />
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
