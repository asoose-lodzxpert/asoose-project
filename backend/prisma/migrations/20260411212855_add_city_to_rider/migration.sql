-- AlterTable
ALTER TABLE "Rider" ADD COLUMN     "cityId" TEXT;

-- CreateIndex
CREATE INDEX "Rider_cityId_idx" ON "Rider"("cityId");

-- AddForeignKey
ALTER TABLE "Rider" ADD CONSTRAINT "Rider_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
