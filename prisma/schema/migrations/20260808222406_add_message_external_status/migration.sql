-- CreateEnum
CREATE TYPE "ExternalMessageStatus" AS ENUM ('sent', 'delivered', 'read', 'failed');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "external_status" "ExternalMessageStatus",
ADD COLUMN     "external_status_at" TIMESTAMP(3),
ADD COLUMN     "played_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
