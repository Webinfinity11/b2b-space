import { ka } from "@/i18n/ka";
import { campaignFiles } from "@/lib/campaign-files";
import { CAMPAIGN_STEPS } from "@/lib/campaigns";
import { formatDate } from "@/lib/format";
import { formatAmount } from "@/lib/money";
import { Icon } from "@/components/ui/Icon";
import { CampaignStatusPill } from "./CampaignStatusPill";

type Req = {
  title: string;
  message: string | null;
  perk: string | null;
  ctaUrl: string | null;
  fileUrl: string | null;
  attachments?: unknown;
  fileName: string | null;
  positions: string | null;
  startDate: Date | null;
  status: string;
  price: { toString(): string } | null;
  adminNote: string | null;
  cities: string[];
  sizes: string[];
  roles: string[];
  createdAt: Date;
};

/** Status stepper. */
export function CampaignStepper({ status }: { status: string }) {
  const idx = CAMPAIGN_STEPS.indexOf(status as (typeof CAMPAIGN_STEPS)[number]);
  if (status === "REJECTED") return <CampaignStatusPill status="REJECTED" />;
  return (
    <ol className="grid grid-cols-5 gap-2">
      {CAMPAIGN_STEPS.map((s, i) => {
        const done = i <= idx;
        return (
          <li key={s} className="min-w-0">
            <div className={`h-1.5 rounded-full ${done ? "bg-accent" : "bg-line"}`} />
            <div className={`mt-1.5 truncate text-[11px] ${i === idx ? "font-semibold text-ink" : done ? "text-secondary" : "text-muted"}`}>{ka.sgba.campStepLabels[s]}</div>
          </li>
        );
      })}
    </ol>
  );
}

/** Audience + offer + price + results of one campaign application. */
export function CampaignDetail({ r, industries, positions = [], reach, results }: { r: Req; industries: string[]; positions?: string[]; reach: number; results?: { recipients: number; views: number; replies: number } }) {
  const c = ka.sgba;
  const chips = (items: string[]) =>
    items.length ? items.map((x) => <span key={x} className="rounded-full bg-chip px-2.5 py-1 text-xs">{x}</span>) : <span className="text-xs text-muted">{ka.sgba.all}</span>;
  return (
    <div className="space-y-5">
      <section className="rounded-[16px] border border-line bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">{r.title}</h2>
          <CampaignStatusPill status={r.status} />
        </div>
        <CampaignStepper status={r.status} />
        {r.adminNote && <p className="mt-4 rounded-[10px] bg-canvas px-3 py-2 text-sm text-secondary">{r.adminNote}</p>}
      </section>

      {results && (
        <section className="grid grid-cols-3 gap-3">
          {[
            [c.campRecipients, results.recipients],
            [c.campViews, results.views],
            [c.campReplies, results.replies],
          ].map(([label, n]) => (
            <div key={String(label)} className="rounded-card border border-line bg-surface p-4 text-center">
              <div className="text-2xl font-bold text-ink tabular-nums">{n}</div>
              <div className="text-xs text-muted">{label}</div>
            </div>
          ))}
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[16px] border border-line bg-surface p-5">
          <h3 className="text-sm font-semibold text-ink">{c.campAudienceTitle}</h3>
          <p className="mt-1 text-xs font-semibold text-success">{c.campReach(reach)}</p>
          <dl className="mt-3 space-y-3 text-sm">
            <div><dt className="mb-1 text-xs text-muted">{c.industry}</dt><dd className="flex flex-wrap gap-1.5">{chips(industries)}</dd></div>
            <div><dt className="mb-1 text-xs text-muted">{c.city}</dt><dd className="flex flex-wrap gap-1.5">{chips(r.cities)}</dd></div>
            <div><dt className="mb-1 text-xs text-muted">{c.size}</dt><dd className="flex flex-wrap gap-1.5">{chips(r.sizes.map((s) => c.sizeFull[s]))}</dd></div>
            <div><dt className="mb-1 text-xs text-muted">{c.role}</dt><dd className="flex flex-wrap gap-1.5">{chips(r.roles.map((s) => c.roles[s]))}</dd></div>
            {positions.length > 0 ? (
              <div><dt className="mb-1 text-xs text-muted">{c.campPositions}</dt><dd className="flex flex-wrap gap-1.5">{chips(positions)}</dd></div>
            ) : r.positions ? (
              <div><dt className="text-xs text-muted">{c.campPositions}</dt><dd>{r.positions}</dd></div>
            ) : null}
            {r.startDate && <div><dt className="text-xs text-muted">{c.campStart}</dt><dd>{formatDate(r.startDate)}</dd></div>}
          </dl>
        </div>
        <div className="rounded-[16px] border border-line bg-surface p-5">
          <h3 className="text-sm font-semibold text-ink">{c.campOfferTitle}</h3>
          {r.perk && <div className="mt-3 rounded-[10px] bg-blue-soft px-3 py-2 text-sm font-bold text-accent">{r.perk}</div>}
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-secondary">{r.message}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {r.ctaUrl && <a href={r.ctaUrl} target="_blank" rel="noopener noreferrer" className="text-accent-strong hover:underline">{r.ctaUrl}</a>}
            {campaignFiles(r).map((f) => (
              <a key={f.url} href={f.url} target="_blank" className="inline-flex items-center gap-1.5 text-accent-strong hover:underline">
                <Icon name="folder" size={15} /> {f.name}
              </a>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
            <span className="text-muted">{c.campPrice}</span>
            <span className="font-bold text-ink">{r.price ? formatAmount(Number(r.price.toString()), "GEL") : c.campPriceTbd}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
