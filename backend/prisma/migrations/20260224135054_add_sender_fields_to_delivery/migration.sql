-- AlterTable
ALTER TABLE "Banner" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "senderName" TEXT,
ADD COLUMN     "senderPhone" TEXT;
