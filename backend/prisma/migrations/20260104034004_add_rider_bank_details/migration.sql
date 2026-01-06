/*
  Warnings:

  - A unique constraint covering the columns `[riderProfileId]` on the table `BankAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "riderProfileId" TEXT,
ALTER COLUMN "storeId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_riderProfileId_key" ON "BankAccount"("riderProfileId");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_riderProfileId_fkey" FOREIGN KEY ("riderProfileId") REFERENCES "RiderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
