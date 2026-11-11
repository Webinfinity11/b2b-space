-- Direct chats: which side sells
ALTER TABLE "Conversation" ADD COLUMN "sellerSide" "ParticipantSide";
-- Commission percent frozen at invoice issue
ALTER TABLE "Invoice" ADD COLUMN "commissionPct" DECIMAL(5,2);
