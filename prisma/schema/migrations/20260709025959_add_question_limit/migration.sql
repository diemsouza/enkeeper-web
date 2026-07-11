-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "question_limit" INTEGER NOT NULL DEFAULT 0;

-- Backfill: existing activities (created with batch generation) had all questions pre-generated,
-- so question_limit = question_count (the total that was generated)
UPDATE "activities" SET "question_limit" = "question_count";
