-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notificationsPreferences" JSONB;

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "riderId" TEXT,
    "vendorId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relationship" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmergencyContact_userId_idx" ON "EmergencyContact"("userId");

-- CreateIndex
CREATE INDEX "EmergencyContact_riderId_idx" ON "EmergencyContact"("riderId");

-- CreateIndex
CREATE INDEX "EmergencyContact_vendorId_idx" ON "EmergencyContact"("vendorId");

-- CreateIndex
CREATE INDEX "EmergencyContact_isPrimary_idx" ON "EmergencyContact"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyContact_userId_phone_key" ON "EmergencyContact"("userId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyContact_riderId_phone_key" ON "EmergencyContact"("riderId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyContact_vendorId_phone_key" ON "EmergencyContact"("vendorId", "phone");

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
