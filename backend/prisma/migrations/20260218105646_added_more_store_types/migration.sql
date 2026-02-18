-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StoreType" ADD VALUE 'FASHION';
ALTER TYPE "StoreType" ADD VALUE 'ELECTRONICS';
ALTER TYPE "StoreType" ADD VALUE 'FURNITURE';
ALTER TYPE "StoreType" ADD VALUE 'BEAUTY';
ALTER TYPE "StoreType" ADD VALUE 'HEALTH';
ALTER TYPE "StoreType" ADD VALUE 'EDUCATION';
ALTER TYPE "StoreType" ADD VALUE 'SERVICES';
ALTER TYPE "StoreType" ADD VALUE 'AUTOMOTIVE';
ALTER TYPE "StoreType" ADD VALUE 'TRAVEL';
ALTER TYPE "StoreType" ADD VALUE 'ENTERTAINMENT';
ALTER TYPE "StoreType" ADD VALUE 'RETAIL';
ALTER TYPE "StoreType" ADD VALUE 'ONLINE';
ALTER TYPE "StoreType" ADD VALUE 'MANUFACTURING';
ALTER TYPE "StoreType" ADD VALUE 'LOGISTICS';
ALTER TYPE "StoreType" ADD VALUE 'OTHER';
