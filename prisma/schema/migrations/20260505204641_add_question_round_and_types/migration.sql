-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('text', 'audio');

-- CreateEnum
CREATE TYPE "AnswerType" AS ENUM ('text', 'audio');

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "last_question_id" TEXT,
ADD COLUMN     "question_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "question_round" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "answer_type" "AnswerType",
ADD COLUMN     "question_type" "QuestionType" NOT NULL DEFAULT 'text',
ADD COLUMN     "wrong_count" INTEGER NOT NULL DEFAULT 0;
