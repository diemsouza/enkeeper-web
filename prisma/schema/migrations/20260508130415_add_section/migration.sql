-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('vocabulary', 'text', 'exercise');

-- CreateEnum
CREATE TYPE "SectionStatus" AS ENUM ('pending', 'partial', 'completed');

-- AlterTable
ALTER TABLE "llm_usages" ADD COLUMN     "section_id" TEXT;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "section_id" TEXT;

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "doc_id" TEXT,
    "activity_id" TEXT NOT NULL,
    "section_type" "SectionType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "SectionStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sections_user_id_idx" ON "sections"("user_id");

-- CreateIndex
CREATE INDEX "sections_activity_id_status_idx" ON "sections"("activity_id", "status");

-- CreateIndex
CREATE INDEX "llm_usages_section_id_idx" ON "llm_usages"("section_id");

-- CreateIndex
CREATE INDEX "questions_section_id_idx" ON "questions"("section_id");

-- AddForeignKey
ALTER TABLE "llm_usages" ADD CONSTRAINT "llm_usages_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "docs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
