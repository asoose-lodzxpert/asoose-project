/*
  Warnings:

  - The `status` column on the `Transaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_riderPayoutId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_vendorPayoutId_fkey";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "status",
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED';

-- CreateIndex
CREATE INDEX "BankAccount_accountNumber_idx" ON "BankAccount"("accountNumber");

-- CreateIndex
CREATE INDEX "RiderPayout_createdAt_idx" ON "RiderPayout"("createdAt");

-- CreateIndex
CREATE INDEX "RiderProfile_walletBalance_idx" ON "RiderProfile"("walletBalance");

-- CreateIndex
CREATE INDEX "Store_walletBalance_idx" ON "Store"("walletBalance");

-- CreateIndex
CREATE INDEX "Transaction_type_status_createdAt_idx" ON "Transaction"("type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_vendorPayoutId_idx" ON "Transaction"("vendorPayoutId");

-- CreateIndex
CREATE INDEX "Transaction_riderPayoutId_idx" ON "Transaction"("riderPayoutId");

-- CreateIndex
CREATE INDEX "Transaction_deliveryId_idx" ON "Transaction"("deliveryId");

-- CreateIndex
CREATE INDEX "Transaction_status_createdAt_idx" ON "Transaction"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_vendorPayoutId_fkey" FOREIGN KEY ("vendorPayoutId") REFERENCES "VendorPayout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_riderPayoutId_fkey" FOREIGN KEY ("riderPayoutId") REFERENCES "RiderPayout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
