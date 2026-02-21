/*
  Warnings:

  - You are about to drop the column `flutterwaveRecipientCode` on the `BankAccount` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paystack_customer_code]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BankAccount" DROP COLUMN "flutterwaveRecipientCode";

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "paystack_subaccount_code" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dedicated_virtual_account_bank" TEXT,
ADD COLUMN     "dedicated_virtual_account_number" TEXT,
ADD COLUMN     "paystack_customer_code" TEXT,
ADD COLUMN     "wallet_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "wallet_balance_hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "saved_cards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorizationCode" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "expiryMonth" TEXT NOT NULL,
    "expiryYear" TEXT NOT NULL,
    "bin" TEXT,
    "bank" TEXT,
    "cardType" TEXT,
    "accountName" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_cards_userId_idx" ON "saved_cards"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_cards_userId_last4_expiryYear_expiryMonth_key" ON "saved_cards"("userId", "last4", "expiryYear", "expiryMonth");

-- CreateIndex
CREATE UNIQUE INDEX "User_paystack_customer_code_key" ON "User"("paystack_customer_code");

-- AddForeignKey
ALTER TABLE "saved_cards" ADD CONSTRAINT "saved_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
