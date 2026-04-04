-- CreateTable
CREATE TABLE "AdminCustomerMessage" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "subject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminCustomerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminCustomerMessage_customerId_idx" ON "AdminCustomerMessage"("customerId");

-- CreateIndex
CREATE INDEX "AdminCustomerMessage_adminId_idx" ON "AdminCustomerMessage"("adminId");

-- CreateIndex
CREATE INDEX "AdminCustomerMessage_createdAt_idx" ON "AdminCustomerMessage"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AdminCustomerMessage" ADD CONSTRAINT "AdminCustomerMessage_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminCustomerMessage" ADD CONSTRAINT "AdminCustomerMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
