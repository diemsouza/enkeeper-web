-- CreateTable
CREATE TABLE "llm_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "doc_id" TEXT,
    "section_id" TEXT,
    "question_id" TEXT,
    "stage" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "parsed_output" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "cached_tokens" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "llm_logs_user_id_idx" ON "llm_logs"("user_id");

-- CreateIndex
CREATE INDEX "llm_logs_doc_id_idx" ON "llm_logs"("doc_id");

-- CreateIndex
CREATE INDEX "llm_logs_stage_idx" ON "llm_logs"("stage");

-- CreateIndex
CREATE INDEX "llm_logs_created_at_idx" ON "llm_logs"("created_at");

-- AddForeignKey
ALTER TABLE "llm_logs" ADD CONSTRAINT "llm_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_logs" ADD CONSTRAINT "llm_logs_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "docs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_logs" ADD CONSTRAINT "llm_logs_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
