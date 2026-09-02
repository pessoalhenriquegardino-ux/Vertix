-- CreateTable
CREATE TABLE "GoogleSheetConnection" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "sheetTab" TEXT,
    "statusColumnLetter" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "connectedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleSheetConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleSheetConnection_clientId_key" ON "GoogleSheetConnection"("clientId");

-- AddForeignKey
ALTER TABLE "GoogleSheetConnection" ADD CONSTRAINT "GoogleSheetConnection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
