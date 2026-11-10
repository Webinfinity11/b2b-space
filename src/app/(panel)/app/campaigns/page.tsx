import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import Link from "next/link";
import { companyName } from "@/lib/public";
import { CampaignStatusPill } from "@/components/panel/CampaignStatusPill";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatAmount } from "@/lib/money";
import { Icon } from "@/components/ui/Icon";
import { PageHeader, SectionTitle } from "@/components/ui/Card";

export const metadata: Metadata = { title: ka.sgba.nav.campaigns };

const ACCENT: Record<string, string> = { violet: "#6b46a3", blue: "#1d45d1", gold: "#b7791f", teal: "#0f8a8a" };

export default async function CampaignsPage() {
  const user = await requireUser("/app/campaigns");
  const m = await getActiveMembership(user.id);
  const [packages, mine] = await Promise.all([
    db.campaignPackage.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    m ? db.campaignRequest.findMany({ where: { companyId: m.companyId }, orderBy: { createdAt: "desc" }, take: 20 }) : Promise.resolve([]),
  ]);
  const inbox = m
    ? await db.campaignRecipient.findMany({
        where: { companyId: m.companyId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { request: { select: { title: true, perk: true, company: { select: { legalName: true, tradeName: true } } } } },
      })
    : [];

  return (
    <>
      <PageHeader
        eyebrow={ka.sgba.campEyebrow}
        title={ka.sgba.campTitle}
        text={ka.sgba.campText}
        action={
          m ? (
            <Link href="/app/campaigns/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover">
              <Icon name="plus" size={16} /> {ka.sgba.campCreate}
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {packages.map((p) => (
          <article key={p.id} className="flex flex-col overflow-hidden rounded-[16px] border border-line bg-surface">
            <div className="h-[3px]" style={{ background: ACCENT[p.accent] ?? ACCENT.blue }} />
            <div className="flex flex-1 flex-col p-5">
              <span className="grid size-10 place-items-center rounded-[10px] bg-chip" style={{ color: ACCENT[p.accent] ?? ACCENT.blue }}>
                <Icon name="trend" size={19} />
              </span>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-wide text-muted">{p.kind}</div>
              <h3 className="mt-1 text-lg font-semibold text-ink">{p.title}</h3>
              <p className="mt-1 text-sm text-secondary">{p.audience}</p>
              <p className="mt-2 flex-1 text-xs text-muted">{p.channels}</p>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                <span className="text-base font-bold text-ink">{ka.sgba.campFrom(formatAmount(Number(p.priceFrom), "GEL"))}</span>
                {m && (
                  <Link href={`/app/campaigns/new?package=${p.id}`} className="text-sm font-semibold text-accent-strong hover:underline">{ka.sgba.campChoose} →</Link>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-8 rounded-[16px] border border-line bg-surface p-6">
        <h2 className="text-[17px] font-semibold text-ink">{ka.sgba.campHowTitle}</h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {ka.sgba.campSteps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-white">{i + 1}</span>
              <div>
                <div className="text-sm font-semibold">{s.title}</div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {m && (
        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <section className="rounded-[16px] border border-line bg-surface p-6">
            <SectionTitle title={ka.sgba.campMine} />
            {mine.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">{ka.sgba.campNoRequests}</p>
            ) : (
              <ul className="divide-y divide-line">
                {mine.map((r) => (
                  <li key={r.id}>
                    <Link href={`/app/campaigns/${r.id}`} className="flex items-start justify-between gap-3 py-3 hover:bg-canvas/60">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{r.title}</span>
                        <span className="block text-xs text-muted">{formatDate(r.createdAt)}</span>
                      </span>
                      <CampaignStatusPill status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-[16px] border border-line bg-surface p-6">
            <SectionTitle title={ka.sgba.campInboxTitle} />
            {inbox.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">{ka.sgba.campInboxEmpty}</p>
            ) : (
              <ul className="divide-y divide-line">
                {inbox.map((x) => (
                  <li key={x.id}>
                    <Link href={`/app/campaigns/inbox/${x.requestId}`} className="flex items-start justify-between gap-3 py-3 hover:bg-canvas/60">
                      <span className="min-w-0">
                        <span className={`block truncate text-sm ${x.viewedAt ? "" : "font-semibold"}`}>{x.request.title}</span>
                        <span className="block text-xs text-muted">{companyName(x.request.company)} · {formatDate(x.createdAt)}</span>
                      </span>
                      {x.request.perk && <span className="shrink-0 text-sm font-bold text-success">{x.request.perk}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
