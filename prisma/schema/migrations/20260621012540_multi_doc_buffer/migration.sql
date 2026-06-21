/*
  Warnings:

  - You are about to drop the column `message_id` on the `docs` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocStatus" ADD VALUE 'pending';
ALTER TYPE "DocStatus" ADD VALUE 'canceled';

-- AlterEnum
ALTER TYPE "DocType" ADD VALUE 'mixed';

-- DropForeignKey
ALTER TABLE "docs" DROP CONSTRAINT "docs_message_id_fkey";

-- AlterTable
ALTER TABLE "daily_usages" ADD COLUMN     "activity_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "docs" DROP COLUMN "message_id",
ADD COLUMN     "error" TEXT;

-- CreateTable
CREATE TABLE "doc_items" (
    "id" TEXT NOT NULL,
    "doc_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message_id" TEXT,
    "doc_type" "DocType" NOT NULL,
    "raw_content" TEXT NOT NULL,
    "error" TEXT,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doc_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "doc_items_doc_id_idx" ON "doc_items"("doc_id");

-- CreateIndex
CREATE INDEX "doc_items_user_id_idx" ON "doc_items"("user_id");

-- AddForeignKey
ALTER TABLE "doc_items" ADD CONSTRAINT "doc_items_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "docs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_items" ADD CONSTRAINT "doc_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_items" ADD CONSTRAINT "doc_items_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
