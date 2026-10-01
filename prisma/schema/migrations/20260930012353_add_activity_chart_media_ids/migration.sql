-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "chart_completed_media_id" TEXT,
ADD COLUMN     "chart_round_media_id" TEXT;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_chart_completed_media_id_fkey" FOREIGN KEY ("chart_completed_media_id") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_chart_round_media_id_fkey" FOREIGN KEY ("chart_round_media_id") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
