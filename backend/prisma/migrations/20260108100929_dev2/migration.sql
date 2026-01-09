/*
  Warnings:

  - You are about to drop the column `image` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `Store` table. All the data in the column will be lost.
  - Added the required column `description` to the `Store` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vendorId` to the `Store` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Store" DROP CONSTRAINT "Store_ownerId_fkey";

-- DropIndex
DROP INDEX "Store_ownerId_idx";

-- AlterTable
ALTER TABLE "Store" DROP COLUMN "image",
DROP COLUMN "ownerId",
ADD COLUMN     "banner" TEXT,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "openHours" JSONB,
ADD COLUMN     "vendorId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "employees" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "businessRegCert" TEXT,
    "taxIdDoc" TEXT,
    "proofOfAddress" TEXT,
    "image" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_email_key" ON "Vendor"("email");

-- CreateIndex
CREATE INDEX "Store_vendorId_idx" ON "Store"("vendorId");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
