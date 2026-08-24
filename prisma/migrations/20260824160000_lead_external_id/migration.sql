-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_clientId_externalId_key" ON "Lead"("clientId", "externalId");
