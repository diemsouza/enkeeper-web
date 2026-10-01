-- AlterTable
ALTER TABLE "medias" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "user_id" TEXT;

-- AlterTable: user_id nasce nullable, recebe backfill pela activity e so depois fica obrigatorio
ALTER TABLE "questions" ADD COLUMN     "user_id" TEXT;

UPDATE "questions" q
SET "user_id" = a."user_id"
FROM "activities" a
WHERE a."id" = q."activity_id";

ALTER TABLE "questions" ALTER COLUMN "user_id" SET NOT NULL;

-- Backfill: messages.media_id guardava o caminho do storage; passa a ser o id da Media
UPDATE "messages" m
SET "media_id" = md."id"
FROM "medias" md
WHERE m."media_id" IS NOT NULL
  AND md."media_path" = m."media_id";

UPDATE "messages"
SET "media_id" = NULL
WHERE "media_id" IS NOT NULL
  AND "media_id" NOT IN (SELECT "id" FROM "medias");

-- Backfill: dono da media pelo pai
UPDATE "medias" md
SET "user_id" = m."user_id"
FROM "messages" m
WHERE md."parent_type" = 'message'
  AND m."id" = md."parent_id";

UPDATE "medias" md
SET "user_id" = a."user_id"
FROM "activities" a
WHERE md."parent_type" = 'activity'
  AND a."id" = md."parent_id";

UPDATE "medias" md
SET "user_id" = q."user_id"
FROM "questions" q
WHERE md."parent_type" = 'question'
  AND q."id" = md."parent_id";

-- Backfill: origem do usuario (foto enviada e voz da resposta); o resto fica 'system'
UPDATE "medias"
SET "source" = 'user'
WHERE "parent_type" = 'message'
   OR "id" IN (
     SELECT "answer_audio_media_id" FROM "questions"
     WHERE "answer_audio_media_id" IS NOT NULL
   );

-- CreateIndex
CREATE INDEX "medias_user_id_idx" ON "medias"("user_id");

-- CreateIndex
CREATE INDEX "questions_user_id_idx" ON "questions"("user_id");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medias" ADD CONSTRAINT "medias_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
