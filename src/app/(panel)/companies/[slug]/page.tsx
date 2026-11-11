 
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { startCompanyChatAction } from "@/actions/chat";
import { getActiveMembership } from "@/lib/authz";
import type { ReactNode } from "react";
import { ka } from "@/i18n/ka";
import { ReportButton } from "@/components/panel/ReportButton";
import { formatDate } from "@/lib/format";
import { companyName, getPublicCompany, searchOffers } from "@/lib/public";
import { getCurrentUser } from "@/lib/session";
import { Badge, VerifiedMark } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/Card";
import { CompanyLogo } from "@/components/site/CompanyLogo";
import { OfferCard } from "@/components/site/OfferCard";
import { MediaView } from "@/components/site/MediaView";

export async function generateMetadata({ params }: PageProps<"/companies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getPublicCompany(slug);
  return c ? { title: companyName(c), description: c.description ?? undefined } : {};
}

export default async function CompanyPage({ params }: PageProps<"/companies/[slug]">) {
  const { slug } = await params;
  const [company, user] = await Promise.all([getPublicCompany(slug), getCurrentUser()]);
  if (!company) notFound();
  const m = user ? await getActiveMembership(user.id) : null;
  const offers = await searchOffers({ companyId: company.id, loggedIn: Boolean(user), page: 1 });
  const name = companyName(company);
  const verified = company.verificationStatus === "VERIFIED";
  const country = ka.countries[company.country as keyof typeof ka.countries] ?? company.country;
  const socials = [
    { label: ka.companyForm.facebook, url: company.facebookUrl },
    { label: ka.companyForm.linkedin, url: company.linkedinUrl },
    { label: ka.companyForm.instagram, url: company.instagramUrl },
  ].filter((s) => s.url);
  const showEmail = company.showEmailPublicly && company.contactEmail;
  const showPhone = company.showPhonePublicly && company.contactPhone;

  return (
    <>
      <div aria-hidden="true" className="h-32 rounded-[18px] bg-gradient-to-r from-blue-soft to-blue-soft-2 md:h-40">
        <div className="h-full w-full rounded-[18px] bg-[url(/images/banner-art.webp)] bg-contain bg-right bg-no-repeat [mask-image:linear-gradient(to_right,transparent_40%,#000_75%)]" />
      </div>
      <div className="px-3 sm:px-5">
        <div className="relative -mt-12 flex flex-col gap-5 rounded-card border border-line bg-surface p-5 shadow-card md:flex-row md:items-center md:p-6">
          <CompanyLogo name={name} url={company.logoUrl} size={88} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold">{name}</h1>
            {company.tradeName && company.tradeName !== company.legalName && <p className="text-sm text-muted">{company.legalName}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
              {verified && <VerifiedMark label={ka.company.verified} />}
              <span>{[company.city, country].filter(Boolean).join(", ")}</span>
              <span className="rounded-full bg-chip px-2.5 py-0.5 text-xs font-semibold text-secondary">{ka.sgba.roles[company.businessRole]}</span>
              <span className="text-xs">{ka.sgba.sizeFull[company.size]}</span>
            </div>
            {company.direction && (
              <p className="mt-2 text-sm">
                <span className="text-muted">{ka.sgba.direction}: </span>
                <span className="font-medium">{company.direction}</span>
              </p>
            )}
          </div>
          {m && m.companyId !== company.id ? (
            <form action={startCompanyChatAction}>
              <input type="hidden" name="companyId" value={company.id} />
              <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover">
                {ka.sgba.message}
              </button>
            </form>
          ) : m?.companyId === company.id ? (
            <ButtonLink href="/company/profile" variant="secondary">{ka.sgba.nav.companyProfile}</ButtonLink>
          ) : null}
        </div>

        <div className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader title={ka.company.about} />
              <CardBody className="space-y-5">
                {company.description ? (
                  <p className="whitespace-pre-line text-sm leading-relaxed">{company.description}</p>
                ) : (
                  <p className="text-sm text-muted">{ka.common.none}</p>
                )}
                {company.activities && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">{ka.company.activities}</h3>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{company.activities}</p>
                  </div>
                )}
              </CardBody>
            </Card>

            {company.media.length > 0 && (
              <Card>
                <CardHeader title={ka.company.media} />
                <CardBody className="grid gap-4 sm:grid-cols-2">
                  {company.media.map((m) => (
                    <figure key={m.id}>
                      <MediaView type={m.type} url={m.url} title={m.caption ?? name} className="rounded-lg border border-line" />
                      {m.caption && <figcaption className="mt-1 text-xs text-muted">{m.caption}</figcaption>}
                    </figure>
                  ))}
                </CardBody>
              </Card>
            )}

            <section id="offers" className="scroll-mt-20">
              <h2 className="mb-4 text-lg font-semibold">{ka.company.activeOffers}</h2>
              {offers.items.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                  {offers.items.map((o) => (
                    <OfferCard key={o.id} offer={o} />
                  ))}
                </div>
              ) : (
                <EmptyState text={ka.company.noActiveOffers} />
              )}
              <p className="mt-4 text-sm text-muted">
                {user ? (
                  ka.company.contactCtaText
                ) : (
                  <Link href={`/login?next=/companies/${company.slug}`} className="text-accent-strong hover:underline">
                    {ka.company.loginToContact}
                  </Link>
                )}
              </p>
            </section>
          </div>

          <aside className="space-y-6">
            <Card>
              <CardBody className="space-y-4 text-sm">
                {(company.categories.length > 0 || company.customCategory) && (
                  <InfoRow label={ka.company.categories}>
                    <div className="flex flex-wrap gap-1.5">
                      {company.categories.map((c) => (
                        <Link key={c.category.slug} href={`/companies?category=${c.category.slug}`}>
                          <Badge tone="info">{c.category.name}</Badge>
                        </Link>
                      ))}
                      {company.customCategory && <Badge>{company.customCategory}</Badge>}
                    </div>
                  </InfoRow>
                )}
                <InfoRow label={ka.company.location}>{[company.city, country].filter(Boolean).join(", ")}</InfoRow>
                {company.website && (
                  <InfoRow label={ka.company.website}>
                    <a href={company.website} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-accent-strong hover:underline">
                      {company.website.replace(/^https?:\/\//, "")}
                    </a>
                  </InfoRow>
                )}
                {socials.length > 0 && (
                  <InfoRow label={ka.company.socials}>
                    <div className="flex flex-wrap gap-3">
                      {socials.map((s) => (
                        <a key={s.label} href={s.url!} target="_blank" rel="noopener noreferrer nofollow" className="text-accent-strong hover:underline">
                          {s.label}
                        </a>
                      ))}
                    </div>
                  </InfoRow>
                )}
                <InfoRow label={ka.company.registeredAt}>{formatDate(company.createdAt)}</InfoRow>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={ka.company.contacts} />
              <CardBody className="space-y-3 text-sm">
                {showEmail || showPhone ? (
                  <>
                    {showEmail && (
                      <InfoRow label={ka.company.email}>
                        <a href={`mailto:${company.contactEmail}`} className="text-accent-strong hover:underline">
                          {company.contactEmail}
                        </a>
                      </InfoRow>
                    )}
                    {showPhone && (
                      <InfoRow label={ka.company.phone}>
                        <a href={`tel:${company.contactPhone!.replace(/\s/g, "")}`} className="text-accent-strong hover:underline">
                          {company.contactPhone}
                        </a>
                      </InfoRow>
                    )}
                  </>
                ) : (
                  <p className="text-muted">{ka.company.contactsHidden}</p>
                )}
              </CardBody>
            </Card>
            {m && m.companyId !== company.id && <ReportButton targetType="COMPANY" targetId={company.id} />}
          </aside>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted">{label}</div>
      <div>{children}</div>
    </div>
  );
}
