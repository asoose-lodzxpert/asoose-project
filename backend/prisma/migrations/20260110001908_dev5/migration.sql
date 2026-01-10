/*
  Warnings:

  - You are about to drop the column `image` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `Store` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[vendorId]` on the table `Store` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `vendorId` to the `Store` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `VendorPayout` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PayoutStatus" ADD VALUE 'APPROVED';
ALTER TYPE "PayoutStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "PayoutStatus" ADD VALUE 'REJECTED';

-- DropForeignKey
ALTER TABLE "Store" DROP CONSTRAINT "Store_ownerId_fkey";

-- DropIndex
DROP INDEX "Store_ownerId_idx";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "inventory" INTEGER;

-- AlterTable
ALTER TABLE "RiderProfile" ADD COLUMN     "balance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Store" DROP COLUMN "image",
DROP COLUMN "ownerId",
ADD COLUMN     "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "banner" TEXT,
ADD COLUMN     "description" TEXT NOT NULL DEFAULT 'No description provided',
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "openHours" JSONB,
ADD COLUMN     "vendorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "VendorPayout" ADD COLUMN     "bankAccountId" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "method" SET DEFAULT 'BANK_TRANSFER',
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "employees" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "businessRegCert" TEXT,
    "taxIdDoc" TEXT,
    "proofOfAddress" TEXT,
    "image" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notificationsPreferences" JSONB,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_email_key" ON "Vendor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Store_vendorId_key" ON "Store"("vendorId");

-- CreateIndex
CREATE INDEX "Store_vendorId_idx" ON "Store"("vendorId");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
