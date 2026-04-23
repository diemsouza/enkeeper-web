-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'disabled');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('free', 'pro');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('active', 'canceled', 'past_due');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('whatsapp');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('text', 'audio', 'image');

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
    "plan_code" "PlanCode" NOT NULL DEFAULT 'free',
    "plan_status" "PlanStatus" NOT NULL DEFAULT 'active',
    "plan_expires_at" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "note_type" "NoteType" NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "raw_content" TEXT,
    "file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_tags" (
    "note_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_tags_pkey" PRIMARY KEY ("note_id","tag_id")
);

-- CreateTable
CREATE TABLE "daily_usages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_usages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "note_id" TEXT,
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

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_channels_user_id_idx" ON "user_channels"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_channels_channel_type_channel_id_key" ON "user_channels"("channel_type", "channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_channels_channel_type_channel_code_key" ON "user_channels"("channel_type", "channel_code");

-- CreateIndex
CREATE INDEX "notes_user_id_idx" ON "notes"("user_id");

-- CreateIndex
CREATE INDEX "notes_user_id_created_at_idx" ON "notes"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "tags_user_id_idx" ON "tags"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_user_id_name_key" ON "tags"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "daily_usages_user_id_date_key" ON "daily_usages"("user_id", "date");

-- CreateIndex
CREATE INDEX "llm_usages_user_id_idx" ON "llm_usages"("user_id");

-- CreateIndex
CREATE INDEX "llm_usages_note_id_idx" ON "llm_usages"("note_id");

-- AddForeignKey
ALTER TABLE "user_channels" ADD CONSTRAINT "user_channels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_usages" ADD CONSTRAINT "daily_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_usages" ADD CONSTRAINT "llm_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_usages" ADD CONSTRAINT "llm_usages_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
