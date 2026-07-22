-- CreateEnum
CREATE TYPE "DocSource" AS ENUM ('upload', 'generated');

-- AlterTable
ALTER TABLE "docs" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "source" "DocSource" NOT NULL DEFAULT 'upload';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "pending_intent_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_pending_intent_pending_intent_at_idx" ON "users"("pending_intent", "pending_intent_at");
