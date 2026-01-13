/*
  Warnings:

  - You are about to drop the column `riderProfileId` on the `BankAccount` table. All the data in the column will be lost.
  - You are about to drop the column `riderProfileId` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `riderProfileId` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `riderProfileId` on the `RiderDocument` table. All the data in the column will be lost.
  - You are about to drop the column `riderProfileId` on the `RiderPayout` table. All the data in the column will be lost.
  - You are about to drop the column `riderProfileId` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the `RiderProfile` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[riderId]` on the table `BankAccount` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reference]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[riderId]` on the table `Vehicle` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `gateway` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reference` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `riderId` to the `RiderDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `riderId` to the `RiderPayout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `riderId` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
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
ALTER TABLE "BankAccount" DROP CONSTRAINT "BankAccount_riderProfileId_fkey";

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_riderProfileId_fkey";

-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_riderProfileId_fkey";

-- DropForeignKey
ALTER TABLE "RiderDocument" DROP CONSTRAINT "RiderDocument_riderProfileId_fkey";

-- DropForeignKey
ALTER TABLE "RiderPayout" DROP CONSTRAINT "RiderPayout_riderProfileId_fkey";

-- DropForeignKey
ALTER TABLE "RiderProfile" DROP CONSTRAINT "RiderProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_riderProfileId_fkey";

-- DropIndex
DROP INDEX "BankAccount_riderProfileId_key";

-- DropIndex
DROP INDEX "Delivery_riderProfileId_status_idx";

-- DropIndex
DROP INDEX "Ride_riderProfileId_status_idx";

-- DropIndex
DROP INDEX "RiderDocument_riderProfileId_status_idx";

-- DropIndex
DROP INDEX "RiderPayout_riderProfileId_status_idx";

-- DropIndex
DROP INDEX "Vehicle_riderProfileId_key";

-- AlterTable
ALTER TABLE "BankAccount" DROP COLUMN "riderProfileId",
ADD COLUMN     "flutterwaveRecipientCode" TEXT,
ADD COLUMN     "paystackRecipientCode" TEXT,
ADD COLUMN     "riderId" TEXT;

-- AlterTable
ALTER TABLE "Delivery" DROP COLUMN "riderProfileId",
ADD COLUMN     "riderId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentStatus" TEXT DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "accessCode" TEXT,
ADD COLUMN     "accountName" TEXT,
ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "authorizationUrl" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "gateway" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "reference" TEXT NOT NULL,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Ride" DROP COLUMN "riderProfileId",
ADD COLUMN     "riderId" TEXT;

-- AlterTable
ALTER TABLE "RiderDocument" DROP COLUMN "riderProfileId",
ADD COLUMN     "riderId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RiderPayout" DROP COLUMN "riderProfileId",
ADD COLUMN     "riderId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "riderProfileId",
ADD COLUMN     "riderId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "expoPushToken" TEXT,
ADD COLUMN     "fcmToken" TEXT;

-- AlterTable
ALTER TABLE "VendorPayout" ADD COLUMN     "bankAccountId" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "method" SET DEFAULT 'BANK_TRANSFER',
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- DropTable
DROP TABLE "RiderProfile";

-- CreateTable
CREATE TABLE "Rider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "image" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "expoPushToken" TEXT,
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalRides" INTEGER NOT NULL DEFAULT 0,
    "notificationsPreferences" JSONB,

    CONSTRAINT "Rider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rider_email_key" ON "Rider"("email");

-- CreateIndex
CREATE INDEX "Rider_email_idx" ON "Rider"("email");

-- CreateIndex
CREATE INDEX "Rider_status_idx" ON "Rider"("status");

-- CreateIndex
CREATE INDEX "Rider_isOnline_currentLat_currentLng_idx" ON "Rider"("isOnline", "currentLat", "currentLng");

-- CreateIndex
CREATE INDEX "Rider_rating_idx" ON "Rider"("rating");

-- CreateIndex
CREATE INDEX "Rider_walletBalance_idx" ON "Rider"("walletBalance");

-- CreateIndex
CREATE INDEX "Rider_totalRides_rating_idx" ON "Rider"("totalRides", "rating");

-- CreateIndex
CREATE INDEX "Rider_status_createdAt_idx" ON "Rider"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_riderId_key" ON "BankAccount"("riderId");

-- CreateIndex
CREATE INDEX "Delivery_riderId_status_idx" ON "Delivery"("riderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_reference_idx" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_gateway_status_idx" ON "Payment"("gateway", "status");

-- CreateIndex
CREATE INDEX "Ride_riderId_status_idx" ON "Ride"("riderId", "status");

-- CreateIndex
CREATE INDEX "RiderDocument_riderId_status_idx" ON "RiderDocument"("riderId", "status");

-- CreateIndex
CREATE INDEX "RiderPayout_riderId_status_idx" ON "RiderPayout"("riderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_riderId_key" ON "Vehicle"("riderId");

-- AddForeignKey
ALTER TABLE "RiderPayout" ADD CONSTRAINT "RiderPayout_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderDocument" ADD CONSTRAINT "RiderDocument_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
