-- AlterTable
ALTER TABLE "users" ADD COLUMN     "source" TEXT,
ADD COLUMN     "source_data" JSONB;
