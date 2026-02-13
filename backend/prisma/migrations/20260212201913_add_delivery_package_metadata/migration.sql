-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "containsLiquid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "declaredValue" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "isPerishable" BOOLEAN NOT NULL DEFAULT false;
