-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InquiryStatus') THEN
        CREATE TYPE "InquiryStatus" AS ENUM ('UNREAD', 'READ', 'REPLIED');
    END IF;
END $$;

-- DropIndex
DROP INDEX IF EXISTS "Transaction_riderPayoutId_key";
DROP INDEX IF EXISTS "Transaction_vendorPayoutId_key";

-- AlterTable Ride
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Ride' AND column_name = 'vehicleType') THEN
        ALTER TABLE "Ride" ADD COLUMN "vehicleType" TEXT;
    END IF;
END $$;

-- AlterTable RiderPayout
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'RiderPayout' AND column_name = 'rejectionReason') THEN
        ALTER TABLE "RiderPayout" ADD COLUMN "rejectionReason" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'RiderPayout' AND column_name = 'updatedAt') THEN
        ALTER TABLE "RiderPayout" ADD COLUMN "updatedAt" TIMESTAMP(3);
        UPDATE "RiderPayout" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
        ALTER TABLE "RiderPayout" ALTER COLUMN "updatedAt" SET NOT NULL;
    END IF;
END $$;

-- CreateTable PushToken
CREATE TABLE IF NOT EXISTS "PushToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "userId" TEXT,
    "riderId" TEXT,
    "vendorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable Inquiry
CREATE TABLE IF NOT EXISTS "Inquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'UNREAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable InquiryReply
CREATE TABLE IF NOT EXISTS "InquiryReply" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InquiryReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
DROP INDEX IF EXISTS "PushToken_token_key";
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
DROP INDEX IF EXISTS "PushToken_userId_idx";
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

-- CreateIndex
DROP INDEX IF EXISTS "PushToken_riderId_idx";
CREATE INDEX "PushToken_riderId_idx" ON "PushToken"("riderId");

-- CreateIndex
DROP INDEX IF EXISTS "PushToken_vendorId_idx";
CREATE INDEX "PushToken_vendorId_idx" ON "PushToken"("vendorId");

-- CreateIndex
DROP INDEX IF EXISTS "Inquiry_status_idx";
CREATE INDEX "Inquiry_status_idx" ON "Inquiry"("status");

-- CreateIndex
DROP INDEX IF EXISTS "Inquiry_createdAt_idx";
CREATE INDEX "Inquiry_createdAt_idx" ON "Inquiry"("createdAt" DESC);

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PushToken_userId_fkey') THEN
        ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PushToken_riderId_fkey') THEN
        ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PushToken_vendorId_fkey') THEN
        ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'InquiryReply_inquiryId_fkey') THEN
        ALTER TABLE "InquiryReply" ADD CONSTRAINT "InquiryReply_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
