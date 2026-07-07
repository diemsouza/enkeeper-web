-- AlterTable
ALTER TABLE "daily_usages" ADD COLUMN     "intensive_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "practice_count" INTEGER NOT NULL DEFAULT 0;
