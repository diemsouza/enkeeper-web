-- AlterEnum
ALTER TYPE "QuestionFormat" ADD VALUE 'image_recognition';

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "question_image_description" TEXT,
ADD COLUMN     "question_image_media_id" TEXT;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_question_image_media_id_fkey" FOREIGN KEY ("question_image_media_id") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
