/*
  Warnings:

  - A unique constraint covering the columns `[user_channel_id,external_id]` on the table `messages` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "external_id" TEXT;

-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "messages_user_channel_id_external_id_key" ON "messages"("user_channel_id", "external_id");
