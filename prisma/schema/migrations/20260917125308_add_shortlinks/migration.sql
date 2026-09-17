-- CreateTable
CREATE TABLE "shortlinks" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_access_at" TIMESTAMP(3),
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortlinks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shortlinks_code_key" ON "shortlinks"("code");

-- CreateIndex
CREATE INDEX "shortlinks_expires_at_idx" ON "shortlinks"("expires_at");
