-- CreateTable
CREATE TABLE "RiderPayout" (
    "id" TEXT NOT NULL,
    "riderProfileId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiderPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiderPayout_riderProfileId_status_idx" ON "RiderPayout"("riderProfileId", "status");

-- AddForeignKey
ALTER TABLE "RiderPayout" ADD CONSTRAINT "RiderPayout_riderProfileId_fkey" FOREIGN KEY ("riderProfileId") REFERENCES "RiderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
