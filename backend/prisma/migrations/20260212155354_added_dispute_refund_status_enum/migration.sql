/*
  Warnings:

  - A unique constraint covering the columns `[refundIdempotencyKey]` on the table `Dispute` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DisputeRefundStatus" AS ENUM ('IDLE', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "gatewayRefundId" TEXT,
ADD COLUMN     "refundIdempotencyKey" TEXT,
ADD COLUMN     "refundStatus" "DisputeRefundStatus" NOT NULL DEFAULT 'IDLE';

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_refundIdempotencyKey_key" ON "Dispute"("refundIdempotencyKey");
