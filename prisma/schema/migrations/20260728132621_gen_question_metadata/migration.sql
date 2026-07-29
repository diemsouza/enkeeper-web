-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "meaning" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "provider" "AiProvider",
ADD COLUMN     "source_content" TEXT,
ADD COLUMN     "term" TEXT,
ADD COLUMN     "term_hint" TEXT;

-- AlterTable
ALTER TABLE "sections" ADD COLUMN     "metadata" JSONB;
