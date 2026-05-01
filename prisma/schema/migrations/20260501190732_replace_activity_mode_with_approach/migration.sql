/*
  Warnings:

  - You are about to drop the column `activity_mode` on the `activities` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Approach" AS ENUM ('memorize', 'understand', 'practice', 'discuss', 'reflect');

-- CreateEnum
CREATE TYPE "ApproachConfidence" AS ENUM ('high', 'medium', 'low');

-- AlterTable
ALTER TABLE "activities" DROP COLUMN "activity_mode",
ADD COLUMN     "approach" "Approach" NOT NULL DEFAULT 'discuss',
ADD COLUMN     "approach_confidence" "ApproachConfidence" NOT NULL DEFAULT 'medium',
ADD COLUMN     "approach_override" "Approach";

-- DropEnum
DROP TYPE "ActivityMode";
