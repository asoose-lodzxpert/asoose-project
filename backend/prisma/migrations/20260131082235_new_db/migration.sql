/*
  Warnings:

  - You are about to drop the column `name` on the `OrderItemModifier` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `OrderItemModifier` table. All the data in the column will be lost.
  - Added the required column `modifierId` to the `OrderItemModifier` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderItemModifier" DROP COLUMN "name",
DROP COLUMN "price",
ADD COLUMN     "modifierId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "OrderItemModifier" ADD CONSTRAINT "OrderItemModifier_modifierId_fkey" FOREIGN KEY ("modifierId") REFERENCES "Modifier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
