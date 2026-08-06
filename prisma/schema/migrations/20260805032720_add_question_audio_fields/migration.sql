-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "audio_created_at" TIMESTAMP(3),
ADD COLUMN     "audio_deleted_at" TIMESTAMP(3),
ADD COLUMN     "audio_path" TEXT;
