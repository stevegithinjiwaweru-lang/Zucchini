-- Prisma migration: remove Merchant model and make Order.merchantId nullable
-- Review and apply in staging/production only after backup

BEGIN;

-- Drop FK constraint if it exists (constraint names vary by DB); use IF EXISTS
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_merchantId_fkey";

-- Make merchantId nullable
ALTER TABLE "Order" ALTER COLUMN "merchantId" DROP NOT NULL;

-- Drop the Merchant table
DROP TABLE IF EXISTS "Merchant" CASCADE;

COMMIT;
