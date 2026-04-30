/*
  Warnings:

  - The values [conversation] on the enum `ActivityMode` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActivityMode_new" AS ENUM ('flashcard', 'qa', 'chat', 'mixed');
ALTER TABLE "activities" ALTER COLUMN "activity_mode" DROP DEFAULT;
ALTER TABLE "activities" ALTER COLUMN "activity_mode" TYPE "ActivityMode_new" USING ("activity_mode"::text::"ActivityMode_new");
ALTER TYPE "ActivityMode" RENAME TO "ActivityMode_old";
ALTER TYPE "ActivityMode_new" RENAME TO "ActivityMode";
DROP TYPE "ActivityMode_old";
ALTER TABLE "activities" ALTER COLUMN "activity_mode" SET DEFAULT 'chat';
COMMIT;

-- AlterTable
ALTER TABLE "activities" ALTER COLUMN "activity_mode" SET DEFAULT 'chat';
