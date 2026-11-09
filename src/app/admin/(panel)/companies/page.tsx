import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { ka } from "@/i18n/ka";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { pageParam, param } from "@/lib/params";
import { companyName } from "@/lib/public";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { FilterLinks, Table, Td } from "@/components/ui/Table";
import { controlClass } from "@/components/ui/styles";
import { VerificationBadge } from "@/components/panel/StatusBadges";

export const metadata: Metadata = { title: ka.admin.companies };

const STATUSES = ["PENDING", "IN_REVIEW", "VERIFIED", "REJECTED", "SUSPENDED"] as const;
const PER_PAGE = 25;

export default async function AdminCompaniesPage({ searchParams }: PageProps<"/admin/companies">) {
  await requireAdmin();
  const sp = await searchParams;
  const statusParam = param(sp.status);
  const status = STATUSES.find((s) => s === statusParam);
  const q = param(sp.q);
  const page = pageParam(sp.page);
  const where: Prisma.CompanyWhereInput = {
    ...(status ? { verificationStatus: status } : {}),
    ...(q
      ? {
          OR: [
            { legalName: { contains: q, mode: "insensitive" } },
            { tradeName: { contains: q, mode: "insensitive" } },
            { registrationNumber: { contains: q } },
          ],
        }
      : {}),
  };
  const [total, companies] = await Promise.all([
    db.company.count({ where }),
    db.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { createdBy: { select: { firstName: true, lastName: true, email: true } }, _count: { select: { members: { where: { status: "ACTIVE" } } } } },
    }),
  ]);

  return (
    <>
      <PageHeader title={ka.admin.companies} text={ka.catalog.results(total)} />
      <form className="mb-4 flex max-w-md gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" type="search" defaultValue={q} placeholder={ka.catalog.searchPlaceholder} className={`${controlClass} h-10`} />
      </form>
      <FilterLinks
        base="/admin/companies"
        param="status"
        current={status}
        options={[{ value: "", label: ka.common.all }, ...STATUSES.map((s) => ({ value: s, label: ka.enums.verificationStatus[s] }))]}
      />
      {companies.length === 0 ? (
        <EmptyState text={ka.common.noData} />
      ) : (
        <Table head={[ka.admin.companies, ka.companyForm.registrationNumber, ka.admin.createdBy, ka.admin.members, ka.common.status, ka.admin.registered]}>
          {companies.map((c) => (
            <tr key={c.id} className="hover:bg-canvas/50">
              <Td>
                <Link href={`/admin/companies/${c.id}`} className="font-medium text-accent-strong hover:underline">{companyName(c)}</Link>
                {c.tradeName && <div className="text-xs text-muted">{c.legalName}</div>}
              </Td>
              <Td className="tabular-nums">{c.registrationNumber}</Td>
              <Td>
                {c.createdBy.firstName} {c.createdBy.lastName}
                <div className="text-xs text-muted">{c.createdBy.email}</div>
              </Td>
              <Td className="tabular-nums">{c._count.members}</Td>
              <Td><VerificationBadge status={c.verificationStatus} /></Td>
              <Td className="whitespace-nowrap text-muted">{formatDate(c.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} basePath="/admin/companies" params={{ status, q }} />
    </>
  );
}
