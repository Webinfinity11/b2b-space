ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'PROCUREMENT';
ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'SALES';
ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'HR';
ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'MARKETING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MATCHING_OFFER';

ALTER TABLE "User" ADD COLUMN "mutedTopics" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Offer" ADD COLUMN "targetIndustryIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Offer" ADD COLUMN "allSectors" BOOLEAN NOT NULL DEFAULT false;

-- Offers created before sector targeting stay visible to everyone.
UPDATE "Offer" SET "allSectors" = true;
CREATE INDEX "Offer_allSectors_idx" ON "Offer"("allSectors");
