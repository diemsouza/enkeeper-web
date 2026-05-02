-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityStatus" ADD VALUE 'archived';
ALTER TYPE "ActivityStatus" ADD VALUE 'cancelled';
ALTER TYPE "ActivityStatus" ADD VALUE 'abandoned';

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "interaction_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_interaction_at" TIMESTAMP(3);
