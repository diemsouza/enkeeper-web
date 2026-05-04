/*
  Warnings:

  - You are about to drop the column `practicing_until` on the `activities` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "activities" DROP COLUMN "practicing_until",
ADD COLUMN     "intensive_until" TIMESTAMP(3);
