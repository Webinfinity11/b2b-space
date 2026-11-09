/**
 * Demo data CLI. Create: DEMO_PASSWORD=... npx tsx prisma/seed-demo.ts · Remove: npx tsx prisma/seed-demo.ts --remove
 * (The platform admin can do the same from /admin → "დემო მონაცემები".)
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { loadDemoData, removeDemoData } from "../src/lib/demo-data";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }) });

async function main() {
  if (process.argv.includes("--remove")) {
    console.log(`Removed ${await removeDemoData(db)} demo users with their data.`);
    return;
  }
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new Error("Set DEMO_PASSWORD to create demo accounts");
  await loadDemoData(db, password);
  console.log("Demo data created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
