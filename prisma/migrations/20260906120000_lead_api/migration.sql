-- AlterTable
ALTER TABLE "Client" ADD COLUMN "apiKey" TEXT;
UPDATE "Client" SET "apiKey" = gen_random_uuid()::text WHERE "apiKey" IS NULL;
ALTER TABLE "Client" ALTER COLUMN "apiKey" SET NOT NULL;
CREATE UNIQUE INDEX "Client_apiKey_key" ON "Client"("apiKey");

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "lastInteractionAt" TIMESTAMP(3);
UPDATE "Lead" SET "lastInteractionAt" = "updatedAt" WHERE "lastInteractionAt" IS NULL;
ALTER TABLE "Lead" ALTER COLUMN "lastInteractionAt" SET NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "lastInteractionAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Lead_clientId_lastInteractionAt_idx" ON "Lead"("clientId", "lastInteractionAt");
