-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "orderGroupId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_orderGroupId_idx" ON "Transaction"("orderGroupId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_orderGroupId_fkey" FOREIGN KEY ("orderGroupId") REFERENCES "OrderGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
