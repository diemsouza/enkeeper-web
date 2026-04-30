/*
  Warnings:

  - You are about to drop the column `last_user_reply` on the `activities` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ActivityMode" AS ENUM ('flashcard', 'qa', 'conversation', 'mixed');

-- AlterTable
ALTER TABLE "activities" DROP COLUMN "last_user_reply",
ADD COLUMN     "activity_mode" "ActivityMode" NOT NULL DEFAULT 'conversation',
ADD COLUMN     "execution_count" INTEGER NOT NULL DEFAULT 0;
