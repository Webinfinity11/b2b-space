import { companyName, globalSearch } from "@/lib/public";
import { offerPriceLabel } from "@/lib/offer-format";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";

/** Live suggestions for the header search (public data only). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const ip = (await clientIp()) ?? "unknown";
  if (!rateLimit(`search:${ip}`, 120, 60_000)) return Response.json({ companies: [], offers: [], categories: [] }, { status: 429 });
  const user = await getCurrentUser();
  const r = await globalSearch(q, Boolean(user));
  return Response.json({
    companies: r.companies.map((c) => ({
      slug: c.slug,
      name: companyName(c),
      city: c.city,
      logoUrl: c.logoUrl,
      verified: c.verificationStatus === "VERIFIED",
    })),
    offers: r.offers.map((o) => ({
      id: o.id,
      title: o.title,
      type: o.type,
      category: o.category?.name ?? null,
      price: offerPriceLabel(o),
    })),
    categories: r.categories.map((c) => ({ slug: c.slug, name: c.name, parent: c.parent?.name ?? null })),
  });
}
