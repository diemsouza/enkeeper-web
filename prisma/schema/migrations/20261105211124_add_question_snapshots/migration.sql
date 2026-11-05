-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "answered_at" TIMESTAMP(3),
ADD COLUMN     "issue_note" TEXT,
ADD COLUMN     "issue_noted_at" TIMESTAMP(3),
ADD COLUMN     "regenerate" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "question_snapshots" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "answered_at" TIMESTAMP(3) NOT NULL,
    "question_format" "QuestionFormat",
    "status" "QuestionStatus",
    "issue_noted_at" TIMESTAMP(3),
    "snapshot_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_snapshots_question_id_idx" ON "question_snapshots"("question_id");

-- CreateIndex
CREATE INDEX "question_snapshots_user_id_answered_at_idx" ON "question_snapshots"("user_id", "answered_at");

-- CreateIndex
CREATE INDEX "question_snapshots_activity_id_idx" ON "question_snapshots"("activity_id");

-- CreateIndex
CREATE INDEX "question_snapshots_question_format_status_idx" ON "question_snapshots"("question_format", "status");

-- CreateIndex
CREATE INDEX "question_snapshots_issue_noted_at_idx" ON "question_snapshots"("issue_noted_at");

-- CreateIndex
CREATE INDEX "questions_user_id_answered_at_idx" ON "questions"("user_id", "answered_at");

-- AddForeignKey
ALTER TABLE "question_snapshots" ADD CONSTRAINT "question_snapshots_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_snapshots" ADD CONSTRAINT "question_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_snapshots" ADD CONSTRAINT "question_snapshots_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: pergunta em revisao (pending) guarda a resposta antiga, mas esta reaberta
UPDATE "questions"
SET "answered_at" = "updated_at"
WHERE "status" IN ('right', 'partial', 'wrong');
