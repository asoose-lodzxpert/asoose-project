-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "cityId" TEXT;

-- AlterTable
ALTER TABLE "service_zones" ADD COLUMN     "state" TEXT NOT NULL DEFAULT 'Borno';

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");

-- CreateIndex
CREATE INDEX "cities_isActive_idx" ON "cities"("isActive");

-- CreateIndex
CREATE INDEX "cities_state_idx" ON "cities"("state");

-- CreateIndex
CREATE INDEX "Store_cityId_status_idx" ON "Store"("cityId", "status");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
