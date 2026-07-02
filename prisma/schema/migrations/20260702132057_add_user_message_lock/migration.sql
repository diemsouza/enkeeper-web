-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_message_id" TEXT,
ADD COLUMN     "last_request_at" TIMESTAMP(3),
ADD COLUMN     "last_response_at" TIMESTAMP(3);
