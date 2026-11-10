/**
 * Seed: platform admin (from env), offer categories, industries, commission rules, campaign packages.
 * Idempotent — safe to run on every deploy. No demo companies or fake data.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slug";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

/** Special-offer categories (სპეც. შეთავაზებების ფილტრი). */
export const OFFER_CATEGORIES = ["საწვავი", "ავტო", "დაზღვევა", "HR", "სასტუმროები", "ფინანსები"];

/** Company industries (ბიზნესების ფილტრი). */
export const INDUSTRIES = [
  "საწვავი და ენერგია", "დაზღვევა", "ავტომობილები", "HoReCa და ღონისძიებები", "მედია და მარკეტინგი", "HR და რეკრუტინგი",
  "ლოჯისტიკა", "სასტუმროები", "რიტეილი და მშენებლობა", "ჯანდაცვა", "მშენებლობა", "IT და ტექნოლოგიები", "სურსათი და წარმოება",
  "საოფისე მომარაგება", "შრომის უსაფრთხოება", "ფარმაცია", "ტურიზმი", "იურიდიული მომსახურება", "პოლიგრაფია და შეფუთვა",
  "ღვინის წარმოება", "განათლება", "დასუფთავების სერვისი", "რიტეილი", "ტრანსპორტი და ლოჯისტიკა", "ბუღალტერია და ფინანსები",
  "ღონისძიებები", "აგრობიზნესი", "დისტრიბუცია", "HR და განათლება",
];

const COMMISSION_RULES: [string, string][] = [
  ["საწვავი და დაბალმარჟიანი პროდუქტი", "ფიქსირებული ან 0.5–1%"],
  ["სტანდარტული B2B სერვისი", "1–3%"],
  ["პროფესიული მაღალი მარჟა", "3–5%"],
  ["დიდი კორპორაციული გარიგება", "ინდივიდუალური ზედა ზღვარი"],
];

const CAMPAIGNS = [
  { kind: "პროექტი", title: "ქალები ქმნიან ბიზნესს", audience: "100 ქალი მეწარმე და ბიზნესის წარმომადგენლები", channels: "პლატფორმა • ელფოსტა • ღონისძიება", priceFrom: 2000, accent: "violet" },
  { kind: "მიზნობრივი კამპანია", title: "HR გადაწყვეტილების მიმღებები", audience: "HR ხელმძღვანელები და კომპანიის დირექტორები", channels: "პლატფორმა • ელფოსტა • SMS", priceFrom: 750, accent: "blue" },
  { kind: "სექტორული კამპანია", title: "სასტუმროები და HoReCa", audience: "სასტუმროების შესყიდვები, HR და ადმინისტრაცია", channels: "პლატფორმა • ელფოსტა • Follow-up", priceFrom: 900, accent: "gold" },
  { kind: "რეგიონული კამპანია", title: "შიდა ქართლის ბიზნესი", audience: "გორისა და რეგიონის აქტიური კომპანიები", channels: "პლატფორმა • მედია • ელფოსტა", priceFrom: 500, accent: "teal" },
];

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    let existing = await db.user.findUnique({ where: { email } });
    if (!existing) {
      // ADMIN_EMAIL changed (e.g. email → plain login): move the single existing admin to the new login.
      const admins = await db.user.findMany({ where: { platformRole: "ADMIN" } });
      if (admins.length === 1) {
        existing = await db.user.update({ where: { id: admins[0].id }, data: { email } });
        console.log(`Admin login changed: ${admins[0].email} → ${email}`);
      }
    }
    if (existing && process.env.ADMIN_SYNC_PASSWORD === "1") {
      // Explicitly requested: make the stored admin password match ADMIN_PASSWORD.
      await db.user.update({ where: { id: existing.id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
      await db.session.deleteMany({ where: { userId: existing.id } });
      console.log(`Admin password synced: ${email}`);
    }
    if (!existing) {
      await db.user.create({
        data: {
          email,
          firstName: "პლატფორმის",
          lastName: "ადმინისტრატორი",
          passwordHash: await bcrypt.hash(password, 12),
          platformRole: "ADMIN",
          emailVerifiedAt: new Date(),
        },
      });
      console.log(`Admin created: ${email}`);
    } else if (existing.platformRole !== "ADMIN") {
      await db.user.update({ where: { id: existing.id }, data: { platformRole: "ADMIN" } });
      console.log(`Admin role granted: ${email}`);
    }
  } else {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set — admin not seeded.");
  }

  // Taxonomy (idempotent by slug).
  for (const [i, name] of OFFER_CATEGORIES.entries()) {
    const slug = `offer-${slugify(name) || i}`;
    await db.category.upsert({ where: { slug }, update: { name, kind: "OFFER", sortOrder: i * 10 }, create: { name, slug, kind: "OFFER", sortOrder: i * 10 } });
  }
  for (const [i, name] of INDUSTRIES.entries()) {
    const slug = slugify(name) || `industry-${i}`;
    await db.category.upsert({ where: { slug }, update: { name, kind: "INDUSTRY", sortOrder: i * 10 }, create: { name, slug, kind: "INDUSTRY", sortOrder: i * 10 } });
  }
  if ((await db.commissionRule.count()) === 0) {
    await db.commissionRule.createMany({ data: COMMISSION_RULES.map(([title, rate], i) => ({ title, rate, sortOrder: i * 10 })) });
  }
  if ((await db.campaignPackage.count()) === 0) {
    await db.campaignPackage.createMany({ data: CAMPAIGNS.map((c, i) => ({ ...c, sortOrder: i * 10 })) });
  }
  console.log("Taxonomy, commission rules and campaign packages ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
