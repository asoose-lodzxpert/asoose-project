-- CreateIndex
CREATE UNIQUE INDEX "users_apple_id_key" ON "users"("apple_id");

-- AlterTable
ALTER TABLE "users" ADD COLUMN "apple_id" TEXT;

-- CreateIndex
CREATE INDEX "users_apple_id_idx" ON "users"("apple_id");
