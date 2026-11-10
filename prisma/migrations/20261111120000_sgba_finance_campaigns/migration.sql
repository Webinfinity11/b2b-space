-- New taxonomy: old categories are removed (the seed creates the SGBA lists).
ALTER TABLE "Category" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'INDUSTRY';
DELETE FROM "CompanyCategory";
UPDATE "Offer" SET "categoryId" = NULL;
UPDATE "Category" SET "parentId" = NULL;
DELETE FROM "Category";

ALTER TABLE "Offer" ADD COLUMN "commissionPct" DECIMAL(5,2), ADD COLUMN "commissionText" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "commissionPct" DECIMAL(5,2);

CREATE TYPE "CommissionStatus" AS ENUM ('CONFIRMED', 'SETTLED', 'CANCELLED');
CREATE TABLE "Commission" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "conversationId" TEXT,
  "companyId" TEXT,
  "currency" TEXT NOT NULL,
  "baseAmount" DECIMAL(18,2) NOT NULL,
  "pct" DECIMAL(5,2) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "status" "CommissionStatus" NOT NULL DEFAULT 'CONFIRMED',
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Commission_invoiceId_key" ON "Commission"("invoiceId");
CREATE INDEX "Commission_companyId_status_idx" ON "Commission"("companyId", "status");
CREATE INDEX "Commission_status_createdAt_idx" ON "Commission"("status", "createdAt");
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CommissionRule" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "rate" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignPackage" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "channels" TEXT NOT NULL,
  "priceFrom" DECIMAL(18,2) NOT NULL,
  "accent" TEXT NOT NULL DEFAULT 'blue',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignPackage_pkey" PRIMARY KEY ("id")
);

CREATE TYPE "CampaignRequestStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'DONE', 'REJECTED');
CREATE TABLE "CampaignRequest" (
  "id" TEXT NOT NULL,
  "packageId" TEXT,
  "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "status" "CampaignRequestStatus" NOT NULL DEFAULT 'NEW',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CampaignRequest_status_createdAt_idx" ON "CampaignRequest"("status", "createdAt");
CREATE INDEX "CampaignRequest_companyId_idx" ON "CampaignRequest"("companyId");
ALTER TABLE "CampaignRequest" ADD CONSTRAINT "CampaignRequest_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CampaignPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CampaignRequest" ADD CONSTRAINT "CampaignRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
