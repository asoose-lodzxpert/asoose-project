-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "details" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "verificationStatus" TEXT DEFAULT 'UNVERIFIED';
