-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "currentStopIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "orderGroupId" TEXT,
ADD COLUMN     "stops" JSONB;
