-- Rename channel_id to channel_user_id, preserving data (BSUID/Telegram userId identifier)
ALTER TABLE "user_channels" RENAME COLUMN "channel_id" TO "channel_user_id";

-- Drop constraints tied to the old column names
DROP INDEX "user_channels_channel_type_channel_id_key";
DROP INDEX "user_channels_channel_type_channel_code_key";

-- channel_code was always null in practice; replaced by channel_username and channel_user_phone
ALTER TABLE "user_channels" DROP COLUMN "channel_code";
ALTER TABLE "user_channels" ADD COLUMN "channel_username" TEXT;
ALTER TABLE "user_channels" ADD COLUMN "channel_user_phone" TEXT;

-- Backfill placeholder: existing rows were created before BSUID existed, so
-- channel_user_id currently holds a phone number. Copy it into
-- channel_user_phone until the real BSUID arrives on the user's next message.
UPDATE "user_channels" SET "channel_user_phone" = "channel_user_id";

-- New unique constraints per channel_type
CREATE UNIQUE INDEX "user_channels_channel_type_channel_user_id_key" ON "user_channels"("channel_type", "channel_user_id");
CREATE UNIQUE INDEX "user_channels_channel_type_channel_username_key" ON "user_channels"("channel_type", "channel_username");
CREATE UNIQUE INDEX "user_channels_channel_type_channel_user_phone_key" ON "user_channels"("channel_type", "channel_user_phone");
