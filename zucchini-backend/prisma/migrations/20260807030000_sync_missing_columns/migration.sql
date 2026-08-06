-- Add missing soft delete fields to Order table
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deletedBy" TEXT,
ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "needsOrderNumberReview" BOOLEAN NOT NULL DEFAULT false;

-- Ensure order indexes exist
CREATE INDEX IF NOT EXISTS "Order_isDeleted_status_idx"
ON "Order"("isDeleted", "status");

CREATE INDEX IF NOT EXISTS "Order_externalId_idx"
ON "Order"("externalId");

CREATE INDEX IF NOT EXISTS "Order_phone_idx"
ON "Order"("phone");

CREATE INDEX IF NOT EXISTS "Order_createdAt_idx"
ON "Order"("createdAt");