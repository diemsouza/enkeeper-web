/*
  Warnings:

  - You are about to drop the column `messages_received` on the `daily_usages` table. All the data in the column will be lost.
  - You are about to drop the column `messages_sent` on the `daily_usages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "daily_usages" DROP COLUMN "messages_received",
DROP COLUMN "messages_sent",
ADD COLUMN     "agent_message_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "messages_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "user_message_count" INTEGER NOT NULL DEFAULT 0;
