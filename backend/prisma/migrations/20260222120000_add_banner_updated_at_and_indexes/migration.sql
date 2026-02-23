-- AlterTable: Add updatedAt field to Banner (defaults to now() for existing rows)
ALTER TABLE "Banner" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex: isActive for fast active-banner queries
CREATE INDEX "Banner_isActive_idx" ON "Banner"("isActive");

-- CreateIndex: type for type-filter queries
CREATE INDEX "Banner_type_idx" ON "Banner"("type");

-- CreateIndex: priority descending for ordered listing
CREATE INDEX "Banner_priority_idx" ON "Banner"("priority" DESC);
