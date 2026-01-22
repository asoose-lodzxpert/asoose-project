-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "vendorId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Address_vendorId_idx" ON "Address"("vendorId");

-- CreateIndex
CREATE INDEX "Address_vendorId_isDefault_idx" ON "Address"("vendorId", "isDefault");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
