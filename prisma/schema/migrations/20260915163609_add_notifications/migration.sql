-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "next_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "external_id" TEXT,
    "read_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_kind_sent_at_deleted_at_next_at_idx" ON "notifications"("kind", "sent_at", "deleted_at", "next_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_kind_created_at_idx" ON "notifications"("user_id", "kind", "created_at");

-- CreateIndex
CREATE INDEX "notifications_external_id_idx" ON "notifications"("external_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "user_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
