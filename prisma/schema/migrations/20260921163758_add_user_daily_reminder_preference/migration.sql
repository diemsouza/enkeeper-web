-- AlterTable
ALTER TABLE "users" ADD COLUMN     "daily_reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "daily_reminder_time" TEXT NOT NULL DEFAULT '20:00',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- CreateIndex
CREATE INDEX "users_daily_reminder_enabled_daily_reminder_time_idx" ON "users"("daily_reminder_enabled", "daily_reminder_time");
