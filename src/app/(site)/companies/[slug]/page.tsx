/* eslint-disable @next/next/no-img-element -- user uploads and design photos */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ka } from "@/i18n/ka";
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
      {/* Decorative banner from the design photo set */}
      <div aria-hidden="true" className="grid h-36 grid-cols-3 gap-2 overflow-hidden rounded-[18px] md:h-44">
        {[0, 4, 7].map((i) => (
          <img key={i} src={`/images/tile-${i}.jpg`} alt="" className="h-full w-full rounded-[14px] border border-line object-cover saturate-[.85]" />
        ))}
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
            </div>
          </div>
          <ButtonLink href="#offers">{ka.company.contactCta}</ButtonLink>
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
                <div className="grid gap-4 sm:grid-cols-2">
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
                        <Link key={c.category.slug} href={`/categories/${c.category.slug}`}>
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
