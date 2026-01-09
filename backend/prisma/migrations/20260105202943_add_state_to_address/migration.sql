/*
  Warnings:

  - Added the required column `state` to the `Address` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- 1. Add column as nullable first
ALTER TABLE "Address" ADD COLUMN "state" TEXT;

-- 2. Fill existing rows with a placeholder value
UPDATE "Address" SET "state" = 'Lagos' WHERE "state" IS NULL;

-- 3. Make the column required
ALTER TABLE "Address" ALTER COLUMN "state" SET NOT NULL;