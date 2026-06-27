-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "user_level" "Level" NOT NULL DEFAULT 'basic';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "level" "Level";
