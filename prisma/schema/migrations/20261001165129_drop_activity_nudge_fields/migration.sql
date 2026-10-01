/*
  Warnings:

  - You are about to drop the column `last_nudge_at` on the `activities` table. All the data in the column will be lost.
  - You are about to drop the column `last_nudge_step` on the `activities` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "activities" DROP COLUMN "last_nudge_at",
DROP COLUMN "last_nudge_step";
