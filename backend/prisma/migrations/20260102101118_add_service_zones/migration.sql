-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'ADMIN_MANAGER';
ALTER TYPE "UserRole" ADD VALUE 'ADMIN_SUPPORT';
ALTER TYPE "UserRole" ADD VALUE 'ADMIN_FINANCE';

-- DropIndex
DROP INDEX "ActivityLog_userId_createdAt_idx";

-- CreateTable
CREATE TABLE "service_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coordinates" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "basePriceMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_action_createdAt_desc_idx" ON "ActivityLog"("action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Dispute_status_createdAt_idx" ON "Dispute"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Dispute_openedByUserId_status_idx" ON "Dispute"("openedByUserId", "status");

-- CreateIndex
CREATE INDEX "Dispute_status_resolvedAt_idx" ON "Dispute"("status", "resolvedAt");

-- CreateIndex
CREATE INDEX "Order_status_deliveredAt_idx" ON "Order"("status", "deliveredAt" DESC);

-- CreateIndex
CREATE INDEX "Order_createdAt_status_idx" ON "Order"("createdAt" DESC, "status");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_amount_idx" ON "Payment"("status", "createdAt" DESC, "amount");

-- CreateIndex
CREATE INDEX "RiderPayout_status_createdAt_idx" ON "RiderPayout"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RiderProfile_totalRides_rating_idx" ON "RiderProfile"("totalRides", "rating");

-- CreateIndex
CREATE INDEX "Transaction_type_createdAt_amount_idx" ON "Transaction"("type", "createdAt" DESC, "amount");

-- CreateIndex
CREATE INDEX "Transaction_entityType_entityId_type_createdAt_idx" ON "Transaction"("entityType", "entityId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "VendorPayout_status_createdAt_idx" ON "VendorPayout"("status", "createdAt" DESC);
