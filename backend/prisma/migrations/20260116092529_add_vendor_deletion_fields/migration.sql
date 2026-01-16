-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "deletionAdditionalInfo" TEXT,
ADD COLUMN     "deletionApprovedAt" TIMESTAMP(3),
ADD COLUMN     "deletionApprovedBy" TEXT,
ADD COLUMN     "deletionReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "deletionStatus" TEXT;
