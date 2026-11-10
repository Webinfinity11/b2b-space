-- Offer badges become an admin-managed list (was a fixed enum).
CREATE TABLE "OfferBadge" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT NOT NULL DEFAULT 'blue',
  "showBanner" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfferBadge_pkey" PRIMARY KEY ("id")
);

INSERT INTO "OfferBadge" ("id", "name", "description", "color", "showBanner", "sortOrder")
VALUES
  ('badge_main_partner', 'მთავარი პარტნიორი', NULL, 'blue', false, 0),
  ('badge_women_business', 'ქალები ქმნიან ბიზნესს', 'სპეციალური შეთავაზებები, პარტნიორობა და გაყიდვების შესაძლებლობები ქალი მეწარმეებისთვის.', 'violet', true, 10);

ALTER TABLE "Offer" ADD COLUMN "badgeId" TEXT;
UPDATE "Offer" SET "badgeId" = 'badge_main_partner' WHERE "tag" = 'MAIN_PARTNER';
UPDATE "Offer" SET "badgeId" = 'badge_women_business' WHERE "tag" = 'WOMEN_BUSINESS';
ALTER TABLE "Offer" DROP COLUMN "tag";
DROP TYPE "OfferTag";

CREATE INDEX "Offer_badgeId_idx" ON "Offer"("badgeId");
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "OfferBadge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
