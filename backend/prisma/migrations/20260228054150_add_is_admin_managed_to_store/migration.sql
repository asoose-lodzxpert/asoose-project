-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'PAYOUT_APPROVED';
ALTER TYPE "TransactionType" ADD VALUE 'PAYOUT_GATEWAY_ERROR';

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "isAdminManaged" BOOLEAN NOT NULL DEFAULT false;
