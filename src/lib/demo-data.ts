/**
 * Demo content from the SGBA analysis: 30 businesses (+ ProCredit Bank and the SGBA demo company),
 * 6 special offers, 4 negotiations with stages and commissions. All accounts use @demo.b2bspace.ge.
 * Used by prisma/seed-demo.ts and by the admin "demo data" buttons. No "server-only" so scripts can import it.
 */
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma/client";

export const DEMO_DOMAIN = "demo.b2bspace.ge";
const DOMAIN = DEMO_DOMAIN;

type Role = "BUYER" | "SELLER" | "BOTH";
type Size = "SMALL" | "MEDIUM" | "LARGE";
const R: Record<string, Role> = { გ: "SELLER", ო: "BOTH", შ: "BUYER" };
const S: Record<string, Size> = { დ: "LARGE", ს: "MEDIUM", მ: "SMALL" };

// abbr | role | name | industry | city | size | direction
const COMPANIES: [string, string, string, string, string, string, string][] = [
  ["GU", "გ", "Gulf Georgia", "საწვავი და ენერგია", "თბილისი", "დ", "კორპორაციული გაყიდვები"],
  ["GP", "ო", "GPI Holding", "დაზღვევა", "თბილისი", "დ", "ბიზნეს დაზღვევა"],
  ["AM", "ო", "Amboli", "ავტომობილები", "თბილისი", "დ", "B2B გაყიდვები"],
  ["LE", "ო", "Lisi Event Hall", "HoReCa და ღონისძიებები", "თბილისი", "ს", "კორპორაციული ღონისძიებები"],
  ["TV", "გ", "TV Monitoring", "მედია და მარკეტინგი", "გორი", "ს", "კორპორაციული გაყიდვები"],
  ["PL", "გ", "PeopleLab", "HR და რეკრუტინგი", "თბილისი", "მ", "HR მომსახურებები"],
  ["TL", "შ", "Tbilisi Logistics", "ლოჯისტიკა", "რუსთავი", "ს", "შესყიდვები"],
  ["HC", "შ", "Hotel Costé", "სასტუმროები", "თბილისი", "ს", "შესყიდვები და ივენთები"],
  ["GO", "ო", "Gorgia", "რიტეილი და მშენებლობა", "თბილისი", "დ", "შესყიდვები"],
  ["TM", "შ", "TestMed Clinic", "ჯანდაცვა", "თბილისი", "ს", "ადმინისტრაცია და შესყიდვები"],
  ["GC", "ო", "GeoConstruct Test", "მშენებლობა", "ბათუმი", "დ", "ტენდერები და შესყიდვები"],
  ["DL", "გ", "Digital Line", "IT და ტექნოლოგიები", "თბილისი", "მ", "B2B გაყიდვები"],
  ["KF", "ო", "Kartli Foods", "სურსათი და წარმოება", "გორი", "ს", "დისტრიბუცია"],
  ["GR", "გ", "Green Office", "საოფისე მომარაგება", "თბილისი", "მ", "კორპორაციული გაყიდვები"],
  ["BH", "ო", "Batumi Business Hotel", "სასტუმროები", "ბათუმი", "ს", "კორპორაციული გაყიდვები და შესყიდვები"],
  ["SW", "გ", "SecureWork", "შრომის უსაფრთხოება", "რუსთავი", "მ", "გაყიდვების დეპარტამენტი"],
  ["PH", "შ", "GeoPharma Test", "ფარმაცია", "თბილისი", "დ", "შესყიდვების დეპარტამენტი"],
  ["IT", "ო", "Imereti Travel", "ტურიზმი", "ქუთაისი", "მ", "პარტნიორული გაყიდვები"],
  ["LP", "გ", "Legal Partners", "იურიდიული მომსახურება", "თბილისი", "მ", "კორპორაციული მომსახურებები"],
  ["CP", "გ", "Caucasus Print", "პოლიგრაფია და შეფუთვა", "თბილისი", "ს", "B2B შეკვეთები"],
  ["WR", "ო", "Wine Route", "ღვინის წარმოება", "თელავი", "ს", "HoReCa და ექსპორტი"],
  ["ED", "გ", "EduLab Georgia", "განათლება", "თბილისი", "ს", "კორპორაციული სწავლება"],
  ["CL", "გ", "CleanPro", "დასუფთავების სერვისი", "თბილისი", "ს", "კორპორაციული გაყიდვები"],
  ["RH", "შ", "Retail House", "რიტეილი", "ქუთაისი", "დ", "შესყიდვები და მომწოდებლები"],
  ["TC", "ო", "TransCaucasus", "ტრანსპორტი და ლოჯისტიკა", "თბილისი", "დ", "გაყიდვები და შესყიდვები"],
  ["FS", "გ", "Finance Support", "ბუღალტერია და ფინანსები", "თბილისი", "მ", "B2B მომსახურებები"],
  ["EF", "ო", "Event Factory", "ღონისძიებები", "თბილისი", "ს", "კორპორაციული ღონისძიებები"],
  ["AK", "ო", "Agro Kartli", "აგრობიზნესი", "გორი", "ს", "მომარაგება და რეალიზაცია"],
  ["BD", "შ", "Black Sea Distribution", "დისტრიბუცია", "ბათუმი", "დ", "შესყიდვები"],
  ["HA", "გ", "HR Academy", "HR და განათლება", "თბილისი", "მ", "კორპორაციული პროგრამები"],
  ["PC", "გ", "ProCredit Bank", "ბუღალტერია და ფინანსები", "თბილისი", "დ", "ბიზნეს ბანკინგი"],
  ["SG", "ო", "SGBA", "HR და განათლება", "თბილისი", "ს", "პარტნიორობა და შესყიდვები"],
];

// company | offer category | title | perk | description | audience | commission % | commission text | tag
const OFFERS: [string, string, string, string, string, string, number | null, string | null, "MAIN_PARTNER" | "WOMEN_BUSINESS" | null][] = [
  ["GU", "საწვავი", "კორპორაციული საწვავი", "−25 თეთრი / ლ", "ფიქსირებული კორპორაციული ფასდაკლება და დღგ-ის ანგარიშფაქტურა წევრებისთვის.", "ავტოპარკის მქონე კომპანიები", null, "ფიქსირებული შეთანხმებით", "MAIN_PARTNER"],
  ["AM", "ავტო", "ავტოპარკის მომსახურება", "30%-მდე", "სპეციალური პირობები საბურავებზე, აკუმულატორებზე, ზეთებსა და მობილურ სერვისზე.", "ტრანსპორტი და ლოჯისტიკა", 1, null, "MAIN_PARTNER"],
  ["GP", "დაზღვევა", "ქალი მეწარმეების ბიზნეს დაზღვევა", "სპეც. პირობა", "ინდივიდუალური სადაზღვევო შეთავაზება კომპანიის, ქონებისა და თანამშრომლებისთვის.", "ქალი მეწარმეები", 2, null, "WOMEN_BUSINESS"],
  ["PC", "ფინანსები", "ბიზნეს ანგარიშის პაკეტი", "პარტნიორის პირობა", "ბიზნესის ყოველდღიური ოპერაციებისთვის სპეციალური კონსულტაცია და პირობები.", "SME და ქალი მეწარმეები", null, "ლიდის ფიქსირებული ფასი", "WOMEN_BUSINESS"],
  ["LE", "სასტუმროები", "კორპორაციული ღონისძიებები", "−18%", "დარბაზი, კვება და სრული ღონისძიების პაკეტი წევრი კომპანიებისთვის.", "HR, მარკეტინგი, ადმინისტრაცია", 3, null, null],
  ["PL", "HR", "HR აუთსორსინგი", "−20%", "რეკრუტინგი, HR აუდიტი და თანამშრომელთა განვითარების პაკეტები.", "დირექტორები და HR", 5, null, null],
];

// seller | offer title | buyer | stage | amount | commission %
const DEALS: [string, string, string, "INTEREST" | "OFFER" | "NEGOTIATION" | "MEETING" | "CONTRACT", number, number][] = [
  ["PL", "HR აუთსორსინგი", "TV", "OFFER", 12000, 5],
  ["LE", "კორპორაციული ღონისძიებები", "SG", "CONTRACT", 18500, 3],
  ["AM", "ავტოპარკის მომსახურება", "TL", "NEGOTIATION", 8400, 1],
  ["GP", "ქალი მეწარმეების ბიზნეს დაზღვევა", "HC", "INTEREST", 24000, 2],
  ["GU", "კორპორაციული საწვავი", "SG", "MEETING", 18500, 1],
];

const ALL_PERMISSIONS = ["company.edit", "offers.manage", "responses.manage", "terms.manage", "invoices.view", "invoices.manage", "finance.view"];

/** Deletes every demo user (…@${DOMAIN}) together with their companies, offers, chats and invoices. */
export async function removeDemoData(db: PrismaClient): Promise<number> {
  const users = await db.user.findMany({ where: { email: { endsWith: `@${DOMAIN}` } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (!ids.length) return 0;
  // Invoices block deletes (Restrict) — remove them and their payments first.
  const invoices = await db.invoice.findMany({ where: { OR: [{ sellerUserId: { in: ids } }, { buyerUserId: { in: ids } }] }, select: { id: true } });
  const invIds = invoices.map((i) => i.id);
  await db.paymentRecord.deleteMany({ where: { invoiceId: { in: invIds } } });
  await db.invoice.deleteMany({ where: { id: { in: invIds } } });
  const convs = await db.conversationParticipant.findMany({ where: { userId: { in: ids } }, select: { conversationId: true } });
  await db.conversation.deleteMany({ where: { id: { in: convs.map((c) => c.conversationId) } } });
  await db.offerResponse.deleteMany({ where: { responderUserId: { in: ids } } });
  await db.offer.deleteMany({ where: { authorUserId: { in: ids } } });
  await db.verificationDecision.deleteMany({ where: { company: { createdById: { in: ids } } } });
  await db.company.deleteMany({ where: { createdById: { in: ids } } });
  await db.notification.deleteMany({ where: { userId: { in: ids } } });
  await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  return ids.length;
}

/** (Re)creates the demo set. Existing demo data is removed first, so it is safe to run repeatedly. */
export async function loadDemoData(db: PrismaClient, password: string) {
  await removeDemoData(db);
  const hash = await bcrypt.hash(password, 12);
  const cats = await db.category.findMany({ select: { id: true, name: true, kind: true } });
  const catId = (name: string, kind: "OFFER" | "INDUSTRY") => cats.find((c) => c.name === name && c.kind === kind)?.id ?? null;

  const owner: Record<string, string> = {};
  const company: Record<string, string> = {};
  for (const [i, [abbr, role, name, industry, city, size, direction]] of COMPANIES.entries()) {
    const sgba = abbr === "SG";
    const user = await db.user.create({
      data: {
        firstName: sgba ? "მაია" : name,
        lastName: sgba ? "ტატულაშვილი" : "მენეჯერი",
        email: sgba ? `maia@${DOMAIN}` : `${abbr.toLowerCase()}@${DOMAIN}`,
        phone: `+995 555 20${String(i).padStart(2, "0")} 00`,
        passwordHash: hash,
        emailVerifiedAt: new Date(),
      },
    });
    const industryId = catId(industry, "INDUSTRY");
    const c = await db.company.create({
      data: {
        slug: `demo-${abbr.toLowerCase()}`,
        legalName: name,
        registrationNumber: `DEMO-${String(i + 1).padStart(3, "0")}`,
        country: "GE",
        city,
        legalAddress: `${city}, სატესტო მისამართი`,
        description: `${name} — ${industry}. სატესტო პროფილი.`,
        contactPerson: sgba ? "მაია ტატულაშვილი" : `${name} მენეჯერი`,
        contactEmail: user.email,
        contactPhone: user.phone,
        businessRole: R[role],
        size: S[size],
        direction,
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
        createdById: user.id,
        categories: industryId ? { create: [{ categoryId: industryId }] } : undefined,
        members: { create: { userId: user.id, role: "OWNER", permissions: ALL_PERMISSIONS } },
      },
    });
    owner[abbr] = user.id;
    company[abbr] = c.id;
  }

  const offerId: Record<string, string> = {};
  for (const [abbr, cat, title, perk, description, audience, pct, pctText, tag] of OFFERS) {
    const o = await db.offer.create({
      data: {
        type: "OFFER",
        title,
        description,
        categoryId: catId(cat, "OFFER"),
        itemKind: "SERVICE",
        perk,
        audience,
        commissionPct: pct,
        commissionText: pctText,
        tag,
        city: "თბილისი",
        authorUserId: owner[abbr],
        companyId: company[abbr],
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    offerId[title] = o.id;
  }

  const now = Date.now();
  for (const [i, [seller, title, buyer, stage, amount, pct]] of DEALS.entries()) {
    const sellerName = COMPANIES.find((c) => c[0] === seller)![2];
    const buyerName = COMPANIES.find((c) => c[0] === buyer)![2];
    await db.conversation.create({
      data: {
        offerId: offerId[title],
        subject: `${sellerName} — ${title}`,
        stage,
        amount,
        commissionPct: pct,
        lastMessageAt: new Date(now - i * 3600_000),
        participants: {
          create: [
            { userId: owner[seller], companyId: company[seller], side: "AUTHOR" },
            { userId: owner[buyer], companyId: company[buyer], side: "RESPONDER", lastReadAt: new Date() },
          ],
        },
        messages: {
          create: [
            { kind: "SYSTEM", body: "conversation.opened" },
            { kind: "TEXT", senderId: owner[buyer], body: `გამარჯობა! ${buyerName}-ს აინტერესებს „${title}“. გთხოვთ, გამოგვიგზავნოთ პირობები.` },
            { kind: "TEXT", senderId: owner[seller], body: "გამარჯობა! სიამოვნებით — დეტალურ შეთავაზებას დღესვე გამოგიგზავნით." },
          ],
        },
      },
    });
  }

  // Recent activity for the SGBA demo user.
  const hours = (h: number) => new Date(now - h * 3600_000);
  await db.notification.createMany({
    data: [
      { userId: owner.SG, type: "NEW_RESPONSE", title: "GPI Holding-მა გამოგიგზავნათ შეთავაზება", link: "/app/conversations", createdAt: hours(1) },
      { userId: owner.SG, type: "NEW_MESSAGE", title: "HR კამპანიას 14 ახალი პასუხი აქვს", link: "/app/campaigns", createdAt: hours(2) },
      { userId: owner.SG, type: "NEW_REPLY", title: "Gulf-ის მოთხოვნა დამუშავების პროცესშია", link: "/app/conversations", createdAt: hours(3) },
    ],
  });
}
