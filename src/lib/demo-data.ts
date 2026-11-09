/**
 * Demo content (clearly marked "(დემო)"): 4 users, 3 companies, 6 offers, one chat.
 * Used by prisma/seed-demo.ts and by the admin "demo data" buttons. No "server-only" so scripts can import it.
 */
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma/client";

export const DEMO_DOMAIN = "demo.b2bspace.ge";
const DOMAIN = DEMO_DOMAIN;

const PEOPLE = [
  { key: "nino", firstName: "ნინო", lastName: "ბერიძე", phone: "+995 555 100 201" },
  { key: "giorgi", firstName: "გიორგი", lastName: "კაპანაძე", phone: "+995 555 100 202" },
  { key: "mariam", firstName: "მარიამ", lastName: "ლომიძე", phone: "+995 555 100 203" },
  { key: "luka", firstName: "ლუკა", lastName: "გელაშვილი", phone: "+995 555 100 204" },
] as const;

const COMPANIES = [
  { owner: "nino", legalName: "შპს „კავკასია ბილდი“ (დემო)", tradeName: "კავკასია ბილდი (დემო)", city: "თბილისი", cat: "samsheneblo-masalebi", verified: true,
    description: "სამშენებლო მასალების საბითუმო მომწოდებელი: ცემენტი, არმატურა, ბლოკი.", activities: "საბითუმო მიწოდება\nლოჯისტიკა თბილისსა და რეგიონებში" },
  { owner: "giorgi", legalName: "შპს „ლოჯი ექსპრესი“ (დემო)", tradeName: "ლოჯი ექსპრესი (დემო)", city: "ბათუმი", cat: "satvirto-gadazidvebi", verified: true,
    description: "სატვირთო გადაზიდვები საქართველოსა და თურქეთს შორის.", activities: "FTL/LTL გადაზიდვები\nსაბაჟო მომსახურება" },
  { owner: "mariam", legalName: "შპს „დიჯი სოლუშენსი“ (დემო)", tradeName: "დიჯი სოლუშენსი (დემო)", city: "თბილისი", cat: "programuli-uzrunvelqopa", verified: false,
    description: "ბიზნეს პროგრამული უზრუნველყოფა და CRM სისტემები.", activities: "ვებ აპლიკაციები\nCRM დანერგვა" },
] as const;

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
  const users: Record<string, string> = {};
  for (const p of PEOPLE) {
    const u = await db.user.create({
      data: { firstName: p.firstName, lastName: p.lastName, phone: p.phone, email: `${p.key}@${DOMAIN}`, passwordHash: hash, emailVerifiedAt: new Date() },
    });
    users[p.key] = u.id;
  }

  const companies: Record<string, string> = {};
  for (const [i, c] of COMPANIES.entries()) {
    const cat = await db.category.findUnique({ where: { slug: c.cat } });
    const company = await db.company.create({
      data: {
        slug: `demo-${i + 1}-${c.cat}`,
        legalName: c.legalName,
        tradeName: c.tradeName,
        registrationNumber: `DEMO-00${i + 1}`,
        country: "GE",
        city: c.city,
        legalAddress: `${c.city}, დემო მისამართი ${i + 1}`,
        description: c.description,
        activities: c.activities,
        contactPerson: PEOPLE.find((p) => p.key === c.owner)!.firstName,
        contactEmail: `${c.owner}@${DOMAIN}`,
        contactPhone: PEOPLE.find((p) => p.key === c.owner)!.phone,
        showEmailPublicly: true,
        verificationStatus: c.verified ? "VERIFIED" : "PENDING",
        verifiedAt: c.verified ? new Date() : null,
        createdById: users[c.owner],
        categories: cat ? { create: [{ categoryId: cat.id }] } : undefined,
        members: { create: { userId: users[c.owner], role: "OWNER", permissions: ["company.edit", "offers.manage", "responses.manage", "terms.manage", "invoices.view", "invoices.manage", "finance.view"] } },
      },
    });
    companies[c.owner] = company.id;
  }

  const catId = async (slug: string) => (await db.category.findUnique({ where: { slug } }))?.id ?? null;
  const in30 = new Date(Date.now() + 30 * 864e5);
  const offers = [
    { author: "nino", company: true, type: "OFFER", title: "ცემენტი M400 — საბითუმო მიწოდება (დემო)", cat: "samsheneblo-masalebi", priceType: "FROM", priceMin: "185", currency: "GEL", quantity: "500", unit: "ტონა",
      description: "ცემენტი M400, 50 კგ ტომრებში. მიწოდება თბილისში 2 დღეში, რეგიონებში — შეთანხმებით.", anonymous: false },
    { author: "nino", company: true, type: "OFFER", title: "არმატურა A500C, Ø12 (დემო)", cat: "samsheneblo-masalebi", priceType: "FIXED", priceMin: "2150", currency: "GEL", quantity: "40", unit: "ტონა",
      description: "არმატურა სერტიფიკატით, ჭრა ზომაზე შესაძლებელია.", anonymous: false },
    { author: "giorgi", company: true, type: "OFFER", title: "სატვირთო გადაზიდვა თბილისი — სტამბოლი (დემო)", cat: "satvirto-gadazidvebi", priceType: "RANGE", priceMin: "4900", priceMax: "6500", currency: "GEL", quantity: null, unit: null,
      description: "სრული ტრაილერი (FTL), 13.6 მ, 24 ტონამდე. ვადა 4–5 დღე.", anonymous: false },
    { author: "mariam", company: true, type: "OFFER", title: "CRM სისტემის დანერგვა მცირე ბიზნესისთვის (დემო)", cat: "programuli-uzrunvelqopa", priceType: "NEGOTIABLE", priceMin: null, currency: null, quantity: null, unit: null,
      description: "CRM-ის დანერგვა, მონაცემების მიგრაცია და თანამშრომლების ტრენინგი.", anonymous: false },
    { author: "luka", company: false, type: "REQUEST", title: "ვეძებთ საოფისე ავეჯის მომწოდებელს (დემო)", cat: "avejis-tsarmoeba", priceType: "NONE", priceMin: null, currency: null, quantity: "25", unit: "სამუშაო ადგილი",
      description: "საჭიროა 25 სამუშაო ადგილის ავეჯი (მაგიდა + სკამი) თბილისში, მიწოდება 3 კვირაში.", anonymous: true },
    { author: "giorgi", company: true, type: "REQUEST", title: "ვეძებთ საწყობს ბათუმში, 500 მ² (დემო)", cat: "satsqobi-da-shenakhva", priceType: "RANGE", priceMin: "3000", priceMax: "4500", currency: "GEL", quantity: "500", unit: "მ²",
      description: "გრძელვადიანი იჯარა, სატვირთოს მისასვლელით.", anonymous: true },
  ] as const;

  const created: Record<string, string> = {};
  for (const o of offers) {
    const offer = await db.offer.create({
      data: {
        type: o.type,
        title: o.title,
        description: o.description,
        categoryId: await catId(o.cat),
        itemKind: o.cat.includes("gadazidv") || o.cat.includes("uzrunvelqofa") || o.cat.includes("satsqobi") ? "SERVICE" : "PRODUCT",
        priceType: o.priceType,
        priceMin: o.priceMin,
        priceMax: "priceMax" in o ? o.priceMax : null,
        currency: o.currency,
        quantity: o.quantity,
        unit: o.unit,
        city: COMPANIES.find((c) => c.owner === o.author)?.city ?? "თბილისი",
        validUntil: in30,
        authorUserId: users[o.author],
        companyId: o.company ? companies[o.author] : null,
        isAnonymous: o.anonymous,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    created[o.title] = offer.id;
  }

  // One ready conversation: Giorgi (Logi Express) responds to Nino's cement offer.
  const cementId = created[offers[0].title];
  const response = await db.offerResponse.create({
    data: { offerId: cementId, responderUserId: users.giorgi, responderCompanyId: companies.giorgi, message: "გამარჯობა! გვაინტერესებს 120 ტონა ბათუმში მიწოდებით. რა ვადაში შეძლებთ?" },
  });
  const conv = await db.conversation.create({
    data: {
      offerId: cementId,
      responseId: response.id,
      subject: offers[0].title,
      participants: {
        create: [
          { userId: users.nino, companyId: companies.nino, side: "AUTHOR", identityRevealed: true },
          { userId: users.giorgi, companyId: companies.giorgi, side: "RESPONDER", identityRevealed: true, lastReadAt: new Date() },
        ],
      },
      messages: {
        create: [
          { kind: "SYSTEM", body: "conversation.opened" },
          { kind: "TEXT", senderId: users.giorgi, body: "გამარჯობა! გვაინტერესებს 120 ტონა ბათუმში მიწოდებით. რა ვადაში შეძლებთ?" },
        ],
      },
    },
  });
  await db.offer.update({ where: { id: cementId }, data: { status: "ACCEPTING_RESPONSES" } });
  await db.notification.create({
    data: { userId: users.nino, type: "NEW_RESPONSE", title: `ახალი გამოხმაურება: „${offers[0].title}“`, link: `/app/conversations/${conv.id}` },
  });
}
