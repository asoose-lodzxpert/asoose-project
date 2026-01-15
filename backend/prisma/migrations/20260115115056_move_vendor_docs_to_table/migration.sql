/*
  Warnings:

  - You are about to drop the column `businessRegCert` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `proofOfAddress` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `taxIdDoc` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `VendorDocument` table. All the data in the column will be lost.
  - Added the required column `vendorId` to the `VendorDocument` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "VendorDocument" DROP CONSTRAINT "VendorDocument_storeId_fkey";

-- DropIndex
DROP INDEX "VendorDocument_storeId_status_idx";

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "businessRegCert",
DROP COLUMN "proofOfAddress",
DROP COLUMN "taxIdDoc";

-- AlterTable
ALTER TABLE "VendorDocument" DROP COLUMN "storeId",
ADD COLUMN     "vendorId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "VendorDocument_vendorId_status_idx" ON "VendorDocument"("vendorId", "status");

-- CreateIndex
CREATE INDEX "VendorDocument_vendorId_name_idx" ON "VendorDocument"("vendorId", "name");

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
