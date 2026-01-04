/*
  Warnings:

  - You are about to drop the column `distance` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `riderId` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `distance` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `fare` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `riderId` on the `Ride` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderId]` on the table `Delivery` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[rideId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[transactionId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,storeId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipientName` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipientPhone` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Store` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `VendorDocument` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'REJECTED';

-- AlterEnum
ALTER TYPE "StoreStatus" ADD VALUE 'CLOSED_PERMANENTLY';

-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "Address" DROP CONSTRAINT "Address_userId_fkey";

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_riderId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_userId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_deliveryId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";

-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_riderId_fkey";

-- DropForeignKey
ALTER TABLE "VendorDocument" DROP CONSTRAINT "VendorDocument_storeId_fkey";

-- DropIndex
DROP INDEX "Order_deliveryId_key";

-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Delivery" DROP COLUMN "distance",
DROP COLUMN "riderId",
ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryOtp" TEXT,
ADD COLUMN     "deliveryProof" TEXT,
ADD COLUMN     "distanceKm" DOUBLE PRECISION,
ADD COLUMN     "isFragile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "pickupProof" TEXT,
ADD COLUMN     "recipientName" TEXT NOT NULL,
ADD COLUMN     "recipientPhone" TEXT NOT NULL,
ADD COLUMN     "riderProfileId" TEXT,
ADD COLUMN     "weightKg" DOUBLE PRECISION,
ALTER COLUMN "status" SET DEFAULT 'REQUESTED';

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "deliveryId",
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "selectedOptions" JSONB;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "rideId" TEXT,
ALTER COLUMN "orderId" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "salesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Ride" DROP COLUMN "distance",
DROP COLUMN "duration",
DROP COLUMN "fare",
DROP COLUMN "riderId",
ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "baseFare" DOUBLE PRECISION,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "distanceFare" DOUBLE PRECISION,
ADD COLUMN     "distanceKm" DOUBLE PRECISION,
ADD COLUMN     "driverFee" DOUBLE PRECISION,
ADD COLUMN     "durationMin" INTEGER,
ADD COLUMN     "platformFee" DOUBLE PRECISION,
ADD COLUMN     "riderProfileId" TEXT,
ADD COLUMN     "startOtp" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "surgeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "timeFare" DOUBLE PRECISION,
ADD COLUMN     "totalFare" DOUBLE PRECISION,
ALTER COLUMN "status" SET DEFAULT 'REQUESTED';

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
ADD COLUMN     "isOpen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "prepTime" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "totalOrders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "VendorDocument" ADD COLUMN     "url" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "VendorPayout" ADD COLUMN     "reference" TEXT;

-- DropEnum
DROP TYPE "AlertSeverity";

-- CreateTable
CREATE TABLE "RiderProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalRides" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "riderProfileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiderDocument" (
    "id" TEXT NOT NULL,
    "riderProfileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiderDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningHour" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,

    CONSTRAINT "OpeningHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreLog" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierGroup" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modifier" (
    "id" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Modifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiderProfile_userId_key" ON "RiderProfile"("userId");

-- CreateIndex
CREATE INDEX "RiderProfile_isOnline_currentLat_currentLng_idx" ON "RiderProfile"("isOnline", "currentLat", "currentLng");

-- CreateIndex
CREATE INDEX "RiderProfile_rating_idx" ON "RiderProfile"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_riderProfileId_key" ON "Vehicle"("riderProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE INDEX "Vehicle_plateNumber_idx" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE INDEX "RiderDocument_riderProfileId_status_idx" ON "RiderDocument"("riderProfileId", "status");

-- CreateIndex
CREATE INDEX "VehicleDocument_vehicleId_idx" ON "VehicleDocument"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleDocument_expiresAt_idx" ON "VehicleDocument"("expiresAt");

-- CreateIndex
CREATE INDEX "OpeningHour_storeId_idx" ON "OpeningHour"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningHour_storeId_dayOfWeek_key" ON "OpeningHour"("storeId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_storeId_key" ON "BankAccount"("storeId");

-- CreateIndex
CREATE INDEX "StoreLog_storeId_createdAt_idx" ON "StoreLog"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "ModifierGroup_productId_idx" ON "ModifierGroup"("productId");

-- CreateIndex
CREATE INDEX "Modifier_modifierGroupId_idx" ON "Modifier"("modifierGroupId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_action_createdAt_idx" ON "ActivityLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "Address_userId_isDefault_idx" ON "Address"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_orderId_key" ON "Delivery"("orderId");

-- CreateIndex
CREATE INDEX "Delivery_orderId_idx" ON "Delivery"("orderId");

-- CreateIndex
CREATE INDEX "Delivery_customerId_status_idx" ON "Delivery"("customerId", "status");

-- CreateIndex
CREATE INDEX "Delivery_riderProfileId_status_idx" ON "Delivery"("riderProfileId", "status");

-- CreateIndex
CREATE INDEX "Delivery_status_createdAt_idx" ON "Delivery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Delivery_createdAt_idx" ON "Delivery"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Dispute_userId_status_idx" ON "Dispute"("userId", "status");

-- CreateIndex
CREATE INDEX "Dispute_status_createdAt_idx" ON "Dispute"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");

-- CreateIndex
CREATE INDEX "Order_storeId_status_idx" ON "Order"("storeId", "status");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_rideId_key" ON "Payment"("rideId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_transactionId_idx" ON "Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_rideId_idx" ON "Payment"("rideId");

-- CreateIndex
CREATE INDEX "Product_storeId_status_idx" ON "Product"("storeId", "status");

-- CreateIndex
CREATE INDEX "Product_categoryId_status_idx" ON "Product"("categoryId", "status");

-- CreateIndex
CREATE INDEX "Product_salesCount_idx" ON "Product"("salesCount" DESC);

-- CreateIndex
CREATE INDEX "Product_slug_idx" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Review_storeId_rating_idx" ON "Review"("storeId", "rating");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_storeId_key" ON "Review"("userId", "storeId");

-- CreateIndex
CREATE INDEX "Ride_customerId_status_idx" ON "Ride"("customerId", "status");

-- CreateIndex
CREATE INDEX "Ride_riderProfileId_status_idx" ON "Ride"("riderProfileId", "status");

-- CreateIndex
CREATE INDEX "Ride_status_createdAt_idx" ON "Ride"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Ride_createdAt_idx" ON "Ride"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Store_ownerId_idx" ON "Store"("ownerId");

-- CreateIndex
CREATE INDEX "Store_status_verification_idx" ON "Store"("status", "verification");

-- CreateIndex
CREATE INDEX "Store_type_status_idx" ON "Store"("type", "status");

-- CreateIndex
CREATE INDEX "Store_lat_lng_idx" ON "Store"("lat", "lng");

-- CreateIndex
CREATE INDEX "Store_slug_idx" ON "Store"("slug");

-- CreateIndex
CREATE INDEX "Store_rating_idx" ON "Store"("rating");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "VendorDocument_storeId_status_idx" ON "VendorDocument"("storeId", "status");

-- CreateIndex
CREATE INDEX "VendorPayout_storeId_status_idx" ON "VendorPayout"("storeId", "status");

-- CreateIndex
CREATE INDEX "VendorPayout_createdAt_idx" ON "VendorPayout"("createdAt");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderProfile" ADD CONSTRAINT "RiderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_riderProfileId_fkey" FOREIGN KEY ("riderProfileId") REFERENCES "RiderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderDocument" ADD CONSTRAINT "RiderDocument_riderProfileId_fkey" FOREIGN KEY ("riderProfileId") REFERENCES "RiderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningHour" ADD CONSTRAINT "OpeningHour_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreLog" ADD CONSTRAINT "StoreLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_riderProfileId_fkey" FOREIGN KEY ("riderProfileId") REFERENCES "RiderProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_riderProfileId_fkey" FOREIGN KEY ("riderProfileId") REFERENCES "RiderProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
