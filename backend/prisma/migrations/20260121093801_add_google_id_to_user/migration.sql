/*
  Warnings:

  - You are about to drop the column `image` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[google_id]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "DeliveryStatus" ADD VALUE 'PENDING';

-- AlterEnum
ALTER TYPE "RideStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "image";

-- AlterTable
ALTER TABLE "Rider" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'RIDER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "google_id" TEXT;

-- CreateIndex
CREATE INDEX "Rider_role_idx" ON "Rider"("role");

-- CreateIndex
CREATE UNIQUE INDEX "User_google_id_key" ON "User"("google_id");

-- CreateIndex
CREATE INDEX "User_google_id_idx" ON "User"("google_id");
