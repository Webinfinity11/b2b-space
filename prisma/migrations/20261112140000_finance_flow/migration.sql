-- Automatic commission rules
ALTER TABLE "CommissionRule"
  ADD COLUMN "pct" DECIMAL(5,2),
  ADD COLUMN "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "minAmount" DECIMAL(18,2),
  ADD COLUMN "capAmount" DECIMAL(18,2),
  ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- SGBA commission invoice
ALTER TABLE "Commission" ADD COLUMN "number" TEXT, ADD COLUMN "ruleId" TEXT, ADD COLUMN "note" TEXT;
CREATE UNIQUE INDEX "Commission_number_key" ON "Commission"("number");
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE SEQUENCE IF NOT EXISTS commission_number_seq;

-- Buyer confirmation + attached seller document
ALTER TABLE "Invoice"
  ADD COLUMN "buyerConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "buyerConfirmedById" TEXT,
  ADD COLUMN "documentKey" TEXT,
  ADD COLUMN "documentName" TEXT,
  ADD COLUMN "documentMime" TEXT;

-- Voiding mistaken payment records
ALTER TABLE "PaymentRecord" ADD COLUMN "voidedAt" TIMESTAMP(3), ADD COLUMN "voidReason" TEXT;
