/*
  Warnings:

  - You are about to drop the column `topic_index` on the `activities` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "QuestionFormat" AS ENUM ('gap_fill', 'recall', 'recall_inverted', 'scenario', 'choice');

-- AlterTable
ALTER TABLE "activities" DROP COLUMN "topic_index";

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "question_format" "QuestionFormat",
ADD COLUMN     "question_options" TEXT[];
