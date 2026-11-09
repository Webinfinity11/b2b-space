import Link from "next/link";
import { ka } from "@/i18n/ka";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";

type Action = { href: string; icon: IconName; title: string; text: string; primary?: boolean };

export function QuickActions({ isOwner, hasCompany }: { isOwner: boolean; hasCompany: boolean }) {
  const q = ka.guide.quick;
  const actions: Action[] = [
    { href: "/company/offers/new?type=OFFER", icon: "plus", ...q.newOffer, primary: true },
    { href: "/company/offers/new?type=REQUEST", icon: "search", ...q.newRequest, primary: true },
    { href: "/companies", icon: "building", ...q.findCompanies },
    { href: "/offers", icon: "tag", ...q.browseOffers },
    { href: "/app/conversations", icon: "chat", ...q.messages },
    { href: "/app/invoices", icon: "invoice", ...q.invoices },
  ];
  if (isOwner) actions.push({ href: "/company/team", icon: "users", ...q.team });
  if (hasCompany) actions.push({ href: "/company/profile", icon: "list", ...q.company });

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-[15px] font-semibold">{ka.guide.quickTitle}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`group flex items-start gap-3 rounded-card border p-4 shadow-card transition-colors ${
              a.primary ? "card-glass border-accent/20 hover:border-accent/40" : "border-line bg-white/[0.012] hover:border-accent/30 hover:bg-accent/[0.04]"
            }`}
          >
            <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${a.primary ? "bg-accent text-navy" : "bg-accent/10 text-accent"}`}>
              <Icon name={a.icon} />
            </span>
            <span>
              <span className="block text-sm font-semibold">{a.title}</span>
              <span className="mt-0.5 block text-xs text-muted">{a.text}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function StartChecklist({ steps }: { steps: { label: string; done: boolean; href: string }[] }) {
  if (steps.every((s) => s.done)) return null;
  const done = steps.filter((s) => s.done).length;
  return (
    <Card className="mb-6">
      <CardHeader title={ka.guide.startTitle} text={ka.guide.startText} action={<span className="text-sm font-semibold tabular-nums text-accent-strong">{done}/{steps.length}</span>} />
      <CardBody>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-canvas">
          <div className="h-full rounded-full bg-accent-strong" style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
              <span className="flex items-center gap-3 text-sm">
                <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${s.done ? "bg-success text-white" : "bg-canvas text-muted"}`}>
                  {s.done ? <Icon name="check" size={14} /> : i + 1}
                </span>
                <span className={s.done ? "text-muted line-through" : ""}>{s.label}</span>
              </span>
              {s.done ? (
                <span className="text-xs text-success">{ka.guide.stepDone}</span>
              ) : (
                <Link href={s.href} className="text-sm font-medium text-accent-strong hover:underline">{ka.guide.stepGo} →</Link>
              )}
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}

export function HowItWorks() {
  return (
    <Card className="mt-6">
      <CardHeader title={ka.guide.howTitle} />
      <CardBody>
        <ol className="grid gap-4 md:grid-cols-4">
          {ka.guide.how.map((text, i) => (
            <li key={i} className="text-sm">
              <span className="text-2xl font-semibold tabular-nums text-accent">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-1 leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}
