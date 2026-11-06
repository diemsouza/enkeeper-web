/*
  Warnings:

  - You are about to drop the column `issue_noted_at` on the `question_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `issue_note` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `issue_noted_at` on the `questions` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "QuestionRatingKind" AS ENUM ('image_mismatch', 'confusing_question', 'answer_was_right', 'audio_or_explanation', 'too_easy', 'too_hard', 'other');

-- DropIndex
DROP INDEX "question_snapshots_issue_noted_at_idx";

-- AlterTable
ALTER TABLE "question_snapshots" DROP COLUMN "issue_noted_at",
ADD COLUMN     "rating" BOOLEAN;

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "issue_note",
DROP COLUMN "issue_noted_at",
ADD COLUMN     "rated_at" TIMESTAMP(3),
ADD COLUMN     "rating" BOOLEAN,
ADD COLUMN     "rating_kind" "QuestionRatingKind",
ADD COLUMN     "rating_note" TEXT;

-- CreateIndex
CREATE INDEX "question_snapshots_rating_idx" ON "question_snapshots"("rating");
