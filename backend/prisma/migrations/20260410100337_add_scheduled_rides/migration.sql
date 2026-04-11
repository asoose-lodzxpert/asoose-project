-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RideStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "RideStatus" ADD VALUE 'DRIVER_ASSIGNED_SCHED';
ALTER TYPE "RideStatus" ADD VALUE 'CANCELLED_SCHEDULED';

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "assignedBy" TEXT,
ADD COLUMN     "assignmentWindowMin" INTEGER DEFAULT 90,
ADD COLUMN     "cancellationDeadline" TIMESTAMP(3),
ADD COLUMN     "estimatedDurationMin" INTEGER,
ADD COLUMN     "estimatedEndTime" TIMESTAMP(3),
ADD COLUMN     "isScheduled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lateCancellation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "scheduledFare" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "DriverUnavailability" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverUnavailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverShift" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledRideReminder" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "minutesBefore" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "bullJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledRideReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriverUnavailability_riderId_startsAt_endsAt_idx" ON "DriverUnavailability"("riderId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "DriverShift_riderId_dayOfWeek_idx" ON "DriverShift"("riderId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "ScheduledRideReminder_rideId_idx" ON "ScheduledRideReminder"("rideId");

-- CreateIndex
CREATE INDEX "ScheduledRideReminder_scheduledFor_success_idx" ON "ScheduledRideReminder"("scheduledFor", "success");

-- CreateIndex
CREATE INDEX "Ride_isScheduled_scheduledAt_idx" ON "Ride"("isScheduled", "scheduledAt");

-- CreateIndex
CREATE INDEX "Ride_riderId_scheduledAt_estimatedEndTime_idx" ON "Ride"("riderId", "scheduledAt", "estimatedEndTime");

-- AddForeignKey
ALTER TABLE "DriverUnavailability" ADD CONSTRAINT "DriverUnavailability_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverShift" ADD CONSTRAINT "DriverShift_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledRideReminder" ADD CONSTRAINT "ScheduledRideReminder_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;
