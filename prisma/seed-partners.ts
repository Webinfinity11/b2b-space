/**
 * The 21 "Members & Partners" from sgba.ge as real platform records: verified company with logo + one published offer.
 * Run: npx tsx prisma/seed-partners.ts
 * Safe to re-run: an existing company (matched by name) is reused, its logo and offers are never overwritten.
 * Offer texts are neutral placeholders (no invented discounts) — each company's real terms replace them.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }) });

// key | name | other spellings | industry | offer category | offer title   (order = public/images/partners/NN.png)
const PARTNERS: [string, string, string[], string, string | null, string][] = [
  ["procredit", "ProCredit Bank", ["პროკრედიტ ბანკი"], "ბუღალტერია და ფინანსები", "ფინანსები", "ბიზნეს საბანკო მომსახურება"],
  ["gpi", "GPI Holding", ["GPI", "ჯიპიაი ჰოლდინგი"], "დაზღვევა", "დაზღვევა", "კორპორაციული დაზღვევა"],
  ["gorgia", "Gorgia", ["გორგია"], "რიტეილი და მშენებლობა", null, "სამშენებლო და სარემონტო მასალები"],
  ["amboli", "Amboli", ["ამბოლი"], "ავტომობილები", "ავტო", "ავტოპარკის მომსახურება"],
  ["gulf", "Gulf", ["Gulf Georgia"], "საწვავი და ენერგია", "საწვავი", "კორპორაციული საწვავი"],
  ["itechnics", "iTechnics", [], "IT და ტექნოლოგიები", null, "Apple ტექნიკა კომპანიებისთვის"],
  ["step", "STEP IT Academy", [], "განათლება", "HR", "IT სწავლება თანამშრომლებისთვის"],
  ["alterbridge", "ალტერბრიჯი", ["Alterbridge"], "განათლება", "HR", "კორპორაციული სწავლება"],
  ["mistore", "Mi Store", ["Xiaomi Mi Store"], "რიტეილი", null, "Xiaomi ტექნიკა კომპანიებისთვის"],
  ["fame", "Fame Consulting", [], "ბუღალტერია და ფინანსები", null, "ბიზნეს კონსულტაცია"],
  ["coachingup", "Coaching UP University", [], "განათლება", "HR", "ქოუჩინგის პროგრამები"],
  ["infinity", "Infinity Solutions", ["ინფინიტი სოლუშენსი"], "IT და ტექნოლოგიები", null, "ვებ და IT გადაწყვეტილებები"],
  ["akhalimzera", "ახალი მზერა", [], "ჯანდაცვა", null, "თვალის კლინიკის მომსახურება"],
  ["geosafety", "ჯეოსეიფთი", ["GeoSafety"], "შრომის უსაფრთხოება", null, "შრომის უსაფრთხოების მომსახურება"],
  ["shuaguli", "Shuaguli", ["შუაგული"], "HoReCa და ღონისძიებები", null, "კორპორაციული მომსახურება"],
  ["igal", "IGAL", ["IGAL | IRGlobal"], "იურიდიული მომსახურება", null, "იურიდიული მომსახურება კომპანიებისთვის"],
  ["metaphora", "Metaphora", [], "HR და განათლება", "HR", "ტრენინგები და განვითარება"],
  ["talant", "Talant.ge", [], "HR და რეკრუტინგი", "HR", "თანამშრომლების შერჩევა"],
  ["adhub", "AdHub", [], "მედია და მარკეტინგი", null, "მარკეტინგული მომსახურება"],
  ["arena", "Arena", ["Sports Complex Arena"], "ფიტნესი და სპორტი", null, "კორპორაციული სპორტული აბონემენტი"],
  ["litz", "Litz Resort", [], "სასტუმროები", "სასტუმროები", "კორპორაციული დასვენება და ღონისძიებები"],
];

const PERMISSIONS = ["company.edit", "offers.manage", "responses.manage", "terms.manage", "invoices.view", "invoices.manage", "finance.view"];

async function main() {
  const cats = await db.category.findMany({ select: { id: true, name: true, kind: true } });
  const catId = (name: string | null, kind: "OFFER" | "INDUSTRY") => cats.find((c) => c.name === name && c.kind === kind)?.id ?? null;

  for (const [i, [key, name, aliases, industry, offerCategory, title]] of PARTNERS.entries()) {
    const logoUrl = `/images/partners/${String(i + 1).padStart(2, "0")}.png`;
    const names = [name, ...aliases];
    let company = await db.company.findFirst({
      where: { OR: names.flatMap((n) => [{ legalName: { equals: n, mode: "insensitive" as const } }, { tradeName: { equals: n, mode: "insensitive" as const } }]) },
      include: { members: { where: { role: "OWNER" }, take: 1 }, _count: { select: { offers: true } } },
    });
    const existed = !!company;

    if (!company) {
      // Placeholder owner with a random password; the admin hands the account over via password reset.
      const email = `${key}@partner.invalid`;
      const user = await db.user.upsert({
        where: { email },
        update: {},
        create: { email, firstName: name, lastName: "მენეჯერი", passwordHash: await bcrypt.hash(randomBytes(24).toString("base64url"), 12), emailVerifiedAt: new Date() },
      });
      const industryId = catId(industry, "INDUSTRY");
      company = await db.company.create({
        data: {
          slug: `partner-${key}`,
          legalName: name,
          registrationNumber: `PARTNER-${String(i + 1).padStart(2, "0")}`,
          country: "GE",
          city: "თბილისი",
          legalAddress: "საქართველო",
          description: `${name} — SGBA-ს წევრი და პარტნიორი კომპანია.`,
          contactPerson: name,
          contactEmail: email,
          logoUrl,
          verificationStatus: "VERIFIED",
          verifiedAt: new Date(),
          createdById: user.id,
          categories: industryId ? { create: [{ categoryId: industryId }] } : undefined,
          members: { create: { userId: user.id, role: "OWNER", permissions: PERMISSIONS } },
        },
        include: { members: { where: { role: "OWNER" }, take: 1 }, _count: { select: { offers: true } } },
      });
    } else if (!company.logoUrl) {
      await db.company.update({ where: { id: company.id }, data: { logoUrl } });
    }

    const addOffer = company._count.offers === 0;
    if (addOffer) {
      await db.offer.create({
        data: {
          type: "OFFER",
          title,
          description: "სპეციალური პირობები SGBA-ს წევრი კომპანიებისთვის. დეტალები შეთანხმებით.",
          categoryId: catId(offerCategory, "OFFER"),
          itemKind: "SERVICE",
          perk: "სპეც. პირობა",
          allSectors: true,
          city: "თბილისი",
          authorUserId: company.members[0]?.userId ?? company.createdById,
          companyId: company.id,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
    }
    console.log(`${name}: ${existed ? "existing company" : "company created"}, ${addOffer ? "offer added" : "already has offers"}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
