-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "answer_audio_media_id" TEXT;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_answer_audio_media_id_fkey" FOREIGN KEY ("answer_audio_media_id") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
