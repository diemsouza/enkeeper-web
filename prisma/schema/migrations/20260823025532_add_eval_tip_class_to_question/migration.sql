-- CreateEnum
CREATE TYPE "EvalTipClass" AS ENUM ('calque', 'near_synonym', 'structure', 'collocation', 'literal_idiom', 'register');

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "eval_tip_class" "EvalTipClass";
