-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'disabled');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('trial', 'pro');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('active', 'canceled', 'past_due', 'expired');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('whatsapp');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('text', 'audio', 'image', 'pdf');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('processing', 'active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('active', 'paused', 'completed');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('openai', 'anthropic', 'google');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "image_url" TEXT,
    "locale" TEXT,
    "currency" TEXT,
    "plan_code" "PlanCode" NOT NULL DEFAULT 'trial',
    "plan_status" "PlanStatus" NOT NULL DEFAULT 'active',
    "plan_expires_at" TIMESTAMP(3),
    "onboarded_at" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_usages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "doc_count" INTEGER NOT NULL DEFAULT 0,
    "messages_sent" INTEGER NOT NULL DEFAULT 0,
    "messages_received" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_channels" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel_type" "ChannelType" NOT NULL,
    "channel_id" TEXT NOT NULL,
    "channel_code" TEXT,
    "name" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "docs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message_id" TEXT,
    "title" TEXT NOT NULL,
    "doc_type" "DocType" NOT NULL,
    "raw_content" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "topics_data" JSONB NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'processing',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "docs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "doc_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "topic_index" INTEGER NOT NULL DEFAULT 0,
    "next_message_at" TIMESTAMP(3),
    "interval_minutes" INTEGER NOT NULL DEFAULT 60,
    "last_user_reply" TEXT,
    "status" "ActivityStatus" NOT NULL DEFAULT 'active',
    "paused_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "report_content" TEXT NOT NULL,
    "summary_data" JSONB NOT NULL,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "weekly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_usages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "doc_id" TEXT,
    "usage_type" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "cached_tokens" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_channel_id" TEXT NOT NULL,
    "activity_id" TEXT,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "intent" TEXT,
    "external_id" TEXT,
    "media_type" TEXT,
    "media_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "daily_usages_user_id_date_key" ON "daily_usages"("user_id", "date");

-- CreateIndex
CREATE INDEX "user_channels_user_id_idx" ON "user_channels"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_channels_channel_type_channel_id_key" ON "user_channels"("channel_type", "channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_channels_channel_type_channel_code_key" ON "user_channels"("channel_type", "channel_code");

-- CreateIndex
CREATE INDEX "docs_user_id_idx" ON "docs"("user_id");

-- CreateIndex
CREATE INDEX "docs_user_id_status_idx" ON "docs"("user_id", "status");

-- CreateIndex
CREATE INDEX "activities_status_next_message_at_idx" ON "activities"("status", "next_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "activities_user_id_doc_id_date_key" ON "activities"("user_id", "doc_id", "date");

-- CreateIndex
CREATE INDEX "weekly_reports_user_id_idx" ON "weekly_reports"("user_id");

-- CreateIndex
CREATE INDEX "llm_usages_user_id_idx" ON "llm_usages"("user_id");

-- CreateIndex
CREATE INDEX "llm_usages_doc_id_idx" ON "llm_usages"("doc_id");

-- CreateIndex
CREATE INDEX "messages_user_id_created_at_idx" ON "messages"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_user_id_role_created_at_idx" ON "messages"("user_id", "role", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "messages_user_channel_id_external_id_key" ON "messages"("user_channel_id", "external_id");

-- AddForeignKey
ALTER TABLE "daily_usages" ADD CONSTRAINT "daily_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_channels" ADD CONSTRAINT "user_channels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docs" ADD CONSTRAINT "docs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docs" ADD CONSTRAINT "docs_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "docs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_usages" ADD CONSTRAINT "llm_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_usages" ADD CONSTRAINT "llm_usages_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "docs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_channel_id_fkey" FOREIGN KEY ("user_channel_id") REFERENCES "user_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
