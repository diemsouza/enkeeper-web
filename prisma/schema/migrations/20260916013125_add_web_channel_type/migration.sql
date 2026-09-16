/*
  Warnings:

  - A unique constraint covering the columns `[user_id,channel_type]` on the table `user_channels` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "ChannelType" ADD VALUE 'web';

-- CreateIndex
CREATE UNIQUE INDEX "user_channels_user_id_channel_type_key" ON "user_channels"("user_id", "channel_type");
