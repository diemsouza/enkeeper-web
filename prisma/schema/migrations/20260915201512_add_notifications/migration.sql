/*
  Warnings:

  - You are about to drop the column `channel_id` on the `notifications` table. All the data in the column will be lost.
  - Added the required column `target_channel` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `target_id` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_channel_id_fkey";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "channel_id",
ADD COLUMN     "target_channel" TEXT NOT NULL,
ADD COLUMN     "target_id" TEXT NOT NULL;
