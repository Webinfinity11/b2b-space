ALTER TYPE "CampaignRequestStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "CampaignRequestStatus" ADD VALUE IF NOT EXISTS 'RUNNING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CAMPAIGN';

ALTER TABLE "CampaignRequest"
  ADD COLUMN "industryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "cities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "sizes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "positions" TEXT,
  ADD COLUMN "perk" TEXT,
  ADD COLUMN "ctaUrl" TEXT,
  ADD COLUMN "fileUrl" TEXT,
  ADD COLUMN "fileName" TEXT,
  ADD COLUMN "startDate" TIMESTAMP(3),
  ADD COLUMN "price" DECIMAL(18,2),
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "launchedAt" TIMESTAMP(3),
  ADD COLUMN "finishedAt" TIMESTAMP(3);

CREATE TABLE "CampaignRecipient" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3),
  "repliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CampaignRecipient_requestId_companyId_key" ON "CampaignRecipient"("requestId", "companyId");
CREATE INDEX "CampaignRecipient_companyId_idx" ON "CampaignRecipient"("companyId");
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CampaignRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
