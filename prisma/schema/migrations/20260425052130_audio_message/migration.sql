/*
  Warnings:

  - You are about to drop the column `raw_content` on the `notes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "media_id" TEXT,
ADD COLUMN     "media_type" TEXT;

-- AlterTable
ALTER TABLE "notes" DROP COLUMN "raw_content",
ADD COLUMN     "media_type" TEXT;
