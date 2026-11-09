import Link from "next/link";
import { ka } from "@/i18n/ka";
import { companyName, type PublicCompanyCard } from "@/lib/public";
import { VerifiedMark } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { CompanyLogo } from "./CompanyLogo";

/** Company card in the workspace "deal card" style: thumb left, meta + title, footer row. */
export function CompanyCard({ company }: { company: PublicCompanyCard }) {
  const name = companyName(company);
  const verified = company.verificationStatus === "VERIFIED";
  const country = ka.countries[company.country as keyof typeof ka.countries] ?? company.country;
  const category = company.categories[0]?.category.name ?? company.customCategory;
  return (
    <Link
      href={`/companies/${company.slug}`}
      className="group flex h-full gap-3.5 rounded-card border border-line bg-card p-3 transition-colors hover:border-accent/30 hover:bg-accent/[0.04]"
    >
      <CompanyLogo name={name} url={company.logoUrl} size={84} />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="truncate text-[11px] text-muted">{[company.city, country].filter(Boolean).join(", ")}</div>
        <h3 className="mt-0.5 truncate text-[15px] font-semibold tracking-tight">{name}</h3>
        {category && <div className="mt-0.5 truncate text-xs text-secondary">{category}</div>}
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          {verified ? (
            <VerifiedMark label={ka.company.verified} />
          ) : (
            <span className="flex items-center gap-1 text-muted">
              <Icon name="arrowUp" size={12} /> {ka.company.registeredAt}
            </span>
          )}
          <span className="text-accent opacity-0 transition-opacity group-hover:opacity-100">
            <Icon name="arrow" size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}
