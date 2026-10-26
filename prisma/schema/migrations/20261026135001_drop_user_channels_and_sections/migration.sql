-- Telefone sai de user_channels para users.phone antes do drop da tabela.
-- Tudo numa transação: se qualquer passo falhar (ex: unique), nada é aplicado.
BEGIN;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "phone" TEXT;

-- Backfill: telefone do canal web primeiro, é por ele que login e webhook resolvem
UPDATE "users" u SET "phone" = uc."channel_user_phone"
FROM "user_channels" uc
WHERE uc."user_id" = u."id"
  AND uc."channel_type" = 'web'
  AND uc."channel_user_phone" IS NOT NULL;

-- Backfill: sem canal web, o do whatsapp, desde que nenhum outro User já tenha o número
UPDATE "users" u SET "phone" = uc."channel_user_phone"
FROM "user_channels" uc
WHERE uc."user_id" = u."id"
  AND uc."channel_type" = 'whatsapp'
  AND uc."channel_user_phone" IS NOT NULL
  AND u."phone" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "users" o WHERE o."phone" = uc."channel_user_phone");

-- DropForeignKey
ALTER TABLE "llm_logs" DROP CONSTRAINT "llm_logs_section_id_fkey";

-- DropForeignKey
ALTER TABLE "llm_usages" DROP CONSTRAINT "llm_usages_section_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_user_channel_id_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_section_id_fkey";

-- DropForeignKey
ALTER TABLE "sections" DROP CONSTRAINT "sections_activity_id_fkey";

-- DropForeignKey
ALTER TABLE "sections" DROP CONSTRAINT "sections_doc_id_fkey";

-- DropForeignKey
ALTER TABLE "sections" DROP CONSTRAINT "sections_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_channels" DROP CONSTRAINT "user_channels_user_id_fkey";

-- DropIndex
DROP INDEX "llm_usages_section_id_idx";

-- DropIndex
DROP INDEX "messages_user_channel_id_external_id_key";

-- DropIndex
DROP INDEX "questions_section_id_idx";

-- AlterTable
ALTER TABLE "activities" DROP COLUMN "section_count";

-- AlterTable
ALTER TABLE "llm_logs" DROP COLUMN "section_id";

-- AlterTable
ALTER TABLE "llm_usages" DROP COLUMN "section_id";

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "user_channel_id";

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "section_id";

-- DropTable
DROP TABLE "sections";

-- DropTable
DROP TABLE "user_channels";

-- DropEnum
DROP TYPE "ChannelType";

-- DropEnum
DROP TYPE "SectionStatus";

-- DropEnum
DROP TYPE "SectionType";

-- CreateIndex
CREATE UNIQUE INDEX "messages_user_id_external_id_key" ON "messages"("user_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

COMMIT;
