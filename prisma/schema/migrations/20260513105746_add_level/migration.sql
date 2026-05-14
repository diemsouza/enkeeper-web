-- CreateEnum
CREATE TYPE "Level" AS ENUM ('basic', 'intermediate', 'advanced');

-- AlterTable
ALTER TABLE "docs" ADD COLUMN     "level" "Level" NOT NULL DEFAULT 'basic';
