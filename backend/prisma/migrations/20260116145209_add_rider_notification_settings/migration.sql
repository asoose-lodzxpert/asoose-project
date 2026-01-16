-- CreateTable
CREATE TABLE "RiderNotificationSettings" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "masterEnabled" BOOLEAN NOT NULL DEFAULT true,
    "newOrders" BOOLEAN NOT NULL DEFAULT true,
    "orderUpdates" BOOLEAN NOT NULL DEFAULT true,
    "vibration" BOOLEAN NOT NULL DEFAULT true,
    "paymentUpdates" BOOLEAN NOT NULL DEFAULT true,
    "dailySummary" BOOLEAN NOT NULL DEFAULT false,
    "weeklySummary" BOOLEAN NOT NULL DEFAULT true,
    "securityAlerts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiderNotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiderNotificationSettings_riderId_key" ON "RiderNotificationSettings"("riderId");

-- CreateIndex
CREATE INDEX "RiderNotificationSettings_riderId_idx" ON "RiderNotificationSettings"("riderId");

-- AddForeignKey
ALTER TABLE "RiderNotificationSettings" ADD CONSTRAINT "RiderNotificationSettings_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
