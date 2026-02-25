-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RideStatus" ADD VALUE 'SEARCHING_DRIVER';
ALTER TYPE "RideStatus" ADD VALUE 'DRIVER_ACCEPTED';
ALTER TYPE "RideStatus" ADD VALUE 'PAID';
ALTER TYPE "RideStatus" ADD VALUE 'CANCELLED_BY_USER';
ALTER TYPE "RideStatus" ADD VALUE 'CANCELLED_BY_DRIVER';
