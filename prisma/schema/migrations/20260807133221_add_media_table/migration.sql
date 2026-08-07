/*
  Warnings:

  - You are about to drop the column `audio_created_at` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `audio_deleted_at` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `audio_path` on the `questions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "questions" DROP COLUMN "audio_created_at",
DROP COLUMN "audio_deleted_at",
DROP COLUMN "audio_path",
ADD COLUMN     "feedback_audio_media_id" TEXT,
ADD COLUMN     "question_audio_media_id" TEXT;

-- CreateTable
CREATE TABLE "medias" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "parent_type" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "media_path" TEXT NOT NULL,
    "media_size" INTEGER NOT NULL DEFAULT 0,
    "media_transcription" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "medias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medias_parent_type_parent_id_idx" ON "medias"("parent_type", "parent_id");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_question_audio_media_id_fkey" FOREIGN KEY ("question_audio_media_id") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_feedback_audio_media_id_fkey" FOREIGN KEY ("feedback_audio_media_id") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
