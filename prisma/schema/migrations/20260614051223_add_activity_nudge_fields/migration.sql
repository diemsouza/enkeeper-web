-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "last_nudge_at" TIMESTAMP(3),
ADD COLUMN     "last_nudge_step" TEXT;
