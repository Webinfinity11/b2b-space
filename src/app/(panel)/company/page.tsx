import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { requireCompany } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { companyName } from "@/lib/public";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, PageHeader, StatCard } from "@/components/ui/Card";
import { VerificationBadge } from "@/components/panel/StatusBadges";
import { CompanyLogo } from "@/components/site/CompanyLogo";

export const metadata: Metadata = { title: ka.panel.companyOverview };

export default async function CompanyOverviewPage() {
  const { membership } = await requireCompany();
  const company = await db.company.findUniqueOrThrow({
    where: { id: membership.companyId },
    include: {
      categories: { include: { category: true } },
      _count: {
        select: {
          members: { where: { status: "ACTIVE" } },
          offers: { where: { status: { in: ["PUBLISHED", "ACCEPTING_RESPONSES", "NEGOTIATING"] } } },
          media: true,
        },
      },
    },
  });
  const name = companyName(company);
  const country = ka.countries[company.country as keyof typeof ka.countries] ?? company.country;

  return (
    <>
      <PageHeader
        title={ka.panel.companyOverview}
        action={
          <>
            <ButtonLink href={`/companies/${company.slug}`} variant="secondary" target="_blank">{ka.admin.publicPage} ↗</ButtonLink>
            {hasPermission(membership, "company.edit") && <ButtonLink href="/company/profile">{ka.common.edit}</ButtonLink>}
          </>
        }
      />
      <Card className="mb-6">
        <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <CompanyLogo name={name} url={company.logoUrl} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{name}</h2>
              <VerificationBadge status={company.verificationStatus} />
            </div>
            <p className="mt-1 text-sm text-muted">{company.legalName} · {company.registrationNumber}</p>
            <p className="text-sm text-muted">{[company.city, country].filter(Boolean).join(", ")}</p>
          </div>
          <div className="text-sm text-muted">{ka.enums.memberRole[membership.role]}</div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label={ka.panel.stats.activeOffers} value={company._count.offers} />
        <StatCard label={ka.admin.members} value={company._count.members} />
        <StatCard label={ka.panel.companyMedia} value={company._count.media} />
      </div>

      <Card className="mt-6">
        <CardHeader title={ka.panel.companyStatusTitle} />
        <CardBody className="space-y-3 text-sm">
          <p>{ka.verification.statusHint[company.verificationStatus]}</p>
          {company.verifiedAt && <p className="text-muted">{ka.enums.verificationStatus.VERIFIED}: {formatDate(company.verifiedAt)}</p>}
          {membership.role === "OWNER" && (
            <Link href="/company/verification" className="inline-block text-accent-strong hover:underline">{ka.panel.verification} →</Link>
          )}
        </CardBody>
      </Card>
    </>
  );
}
