-- AlterTable (nullable primeiro, pra poder popular os clientes já existentes)
ALTER TABLE "Client" ADD COLUMN "webhookToken" TEXT;

-- Backfill: gera um token único pra cada cliente que já existe
UPDATE "Client" SET "webhookToken" = md5(random()::text || clock_timestamp()::text || id)
WHERE "webhookToken" IS NULL;

-- Agora sim, obrigatório
ALTER TABLE "Client" ALTER COLUMN "webhookToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Client_webhookToken_key" ON "Client"("webhookToken");
