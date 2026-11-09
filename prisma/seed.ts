/**
 * Seed: platform admin (from env) + a starting category taxonomy.
 * Idempotent — safe to run on every deploy. No demo companies or fake data.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slug";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const CATEGORIES: [string, string[]][] = [
  ["მშენებლობა და სამშენებლო მასალები", ["სამშენებლო მასალები", "სარემონტო სამუშაოები", "ინჟინერია და პროექტირება"]],
  ["წარმოება", ["კვების წარმოება", "ტექსტილი და ტანსაცმელი", "ავეჯის წარმოება", "პლასტმასი და შეფუთვა"]],
  ["საბითუმო ვაჭრობა", ["სურსათი და სასმელი", "სამომხმარებლო საქონელი", "საყოფაცხოვრებო ქიმია"]],
  ["ლოგისტიკა და ტრანსპორტი", ["სატვირთო გადაზიდვები", "საწყობი და შენახვა", "საბაჟო მომსახურება"]],
  ["IT და ტექნოლოგიები", ["პროგრამული უზრუნველყოფა", "IT ინფრასტრუქტურა", "ციფრული მარკეტინგი"]],
  ["სოფლის მეურნეობა", ["მემცენარეობა", "მეცხოველეობა", "აგროტექნიკა"]],
  ["ენერგეტიკა", ["მზის ენერგია", "ელექტრო მოწყობილობები"]],
  ["პროფესიული მომსახურება", ["იურიდიული მომსახურება", "ბუღალტერია და აუდიტი", "კონსალტინგი", "საკადრო მომსახურება"]],
  ["სასტუმრო და კვების ობიექტები", ["HoReCa მომარაგება", "კეიტერინგი"]],
  ["ჯანდაცვა და ფარმაცია", ["სამედიცინო აღჭურვილობა", "ფარმაცევტული პროდუქცია"]],
  ["აღჭურვილობა და დანადგარები", ["სამრეწველო დანადგარები", "სავაჭრო აღჭურვილობა"]],
  ["ავტომობილები და ნაწილები", ["სატვირთო ტექნიკა", "ავტონაწილები"]],
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

  if ((await db.category.count()) === 0) {
    for (const [i, [name, children]] of CATEGORIES.entries()) {
      const parent = await db.category.create({ data: { name, slug: slugify(name), sortOrder: i * 10 } });
      for (const [j, child] of children.entries()) {
        await db.category.create({ data: { name: child, slug: slugify(child), parentId: parent.id, sortOrder: j * 10 } });
      }
    }
    console.log(`Categories seeded: ${CATEGORIES.length}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
