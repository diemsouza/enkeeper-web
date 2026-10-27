/*
  Warnings:

  - You are about to drop the column `currency` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `locale` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "currency",
DROP COLUMN "locale";
