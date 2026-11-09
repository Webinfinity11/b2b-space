import Link from "next/link";
import { ka } from "@/i18n/ka";
import { Logo } from "@/components/ui/Logo";
import { getPublicSettings } from "@/lib/settings";

export async function Footer() {
  const settings = await getPublicSettings();
  return (
    <footer className="mt-auto border-t border-line bg-navy text-secondary">
      <div className="mx-auto grid max-w-site gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{ka.footer.tagline}</p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink">{ka.footer.platform}</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/companies" className="hover:text-ink">{ka.nav.companies}</Link></li>
            <li><Link href="/offers" className="hover:text-ink">{ka.nav.offers}</Link></li>
            <li><Link href="/register" className="hover:text-ink">{ka.home.registerCompany}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink">{ka.footer.legal}</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/terms" className="hover:text-ink">{ka.footer.terms}</Link></li>
            <li><Link href="/privacy" className="hover:text-ink">{ka.footer.privacy}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink">{ka.footer.contact}</h3>
          {settings.contactEmail || settings.contactPhone || settings.contactAddress ? (
            <ul className="space-y-2 text-sm">
              {settings.contactEmail && <li><a href={`mailto:${settings.contactEmail}`} className="hover:text-ink">{settings.contactEmail}</a></li>}
              {settings.contactPhone && <li><a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="hover:text-ink">{settings.contactPhone}</a></li>}
              {settings.contactAddress && <li className="text-muted">{settings.contactAddress}</li>}
            </ul>
          ) : (
            <p className="text-sm text-muted">{ka.footer.contactPending}</p>
          )}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-site px-4 py-5 text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} {ka.brand}. {ka.footer.rights}
        </div>
      </div>
    </footer>
  );
}
