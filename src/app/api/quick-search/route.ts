import type { Prisma } from "@/generated/prisma/client";
import { ka } from "@/i18n/ka";
import { clientIp } from "@/lib/audit";
import { db } from "@/lib/db";
import { companyName, globalSearch } from "@/lib/public";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

type Row = { href: string; title: string; sub: string; logoUrl?: string | null };
type Group = { title: string; rows: Row[] };

/**
 * Header search popup. With an empty query it lists companies, so a name can simply be picked.
 * `scope=admin` (admins only) covers every company regardless of status, plus offers and users.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const admin = params.get("scope") === "admin";
  const ip = (await clientIp()) ?? "unknown";
  if (!rateLimit(`search:${ip}`, 120, 60_000)) return Response.json({ groups: [] }, { status: 429 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ groups: [] }, { status: 401 });
  if (admin && user.platformRole !== "ADMIN") return Response.json({ groups: [] }, { status: 403 });

  const like = { contains: q, mode: "insensitive" as const };
  const match: Prisma.CompanyWhereInput = q
    ? {
        OR: [
          { legalName: like },
          { tradeName: like },
          { city: like },
          { categories: { some: { category: { name: like } } } },
          ...(admin ? [{ registrationNumber: like }] : []),
        ],
      }
    : {};
  const companies = await db.company.findMany({
    // Members only ever see verified companies.
    where: admin ? match : { AND: [{ verificationStatus: "VERIFIED" }, match] },
    select: { id: true, slug: true, legalName: true, tradeName: true, city: true, logoUrl: true, verificationStatus: true, categories: { take: 1, select: { category: { select: { name: true } } } } },
    orderBy: [{ tradeName: "asc" }, { legalName: "asc" }],
    take: 50,
  });
  const groups: Group[] = [
    {
      title: ka.search.companies,
      rows: companies.map((c) => ({
        href: admin ? `/admin/companies/${c.id}` : `/companies/${c.slug}`,
        title: companyName(c),
        sub: [c.categories[0]?.category.name, c.city, admin ? ka.enums.verificationStatus[c.verificationStatus] : null].filter(Boolean).join(" · "),
        logoUrl: c.logoUrl,
      })),
    },
  ];

  if (q.length >= 2) {
    if (admin) {
      const [offers, users] = await Promise.all([
        db.offer.findMany({
          where: { OR: [{ title: like }, { company: { OR: [{ legalName: like }, { tradeName: like }] } }] },
          select: { id: true, title: true, type: true, company: { select: { legalName: true, tradeName: true } } },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
        db.user.findMany({
          where: { OR: [{ email: like }, { firstName: like }, { lastName: like }] },
          select: { firstName: true, lastName: true, email: true },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
      ]);
      groups.push(
        { title: ka.search.offers, rows: offers.map((o) => ({ href: `/admin/offers/${o.id}`, title: o.title, sub: [ka.enums.offerType[o.type], o.company ? companyName(o.company) : null].filter(Boolean).join(" · ") })) },
        { title: ka.admin.users, rows: users.map((u) => ({ href: `/admin/users?q=${encodeURIComponent(u.email)}`, title: `${u.firstName} ${u.lastName}`, sub: u.email })) },
      );
    } else {
      const r = await globalSearch(q, true, 8);
      groups.push({
        title: ka.search.offers,
        rows: r.offers.map((o) => ({
          href: `/offers/${o.id}`,
          title: o.title,
          sub: [o.publisher.kind === "company" ? o.publisher.name : ka.offer.anonymous, o.category?.name].filter(Boolean).join(" · "),
        })),
      });
    }
  }
  return Response.json({ groups: groups.filter((g) => g.rows.length) });
}
