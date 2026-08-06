-- Soft delete columns on Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "needsOrderNumberReview" BOOLEAN NOT NULL DEFAULT false;

-- Indexes for soft-delete and search performance
CREATE INDEX IF NOT EXISTS "Order_isDeleted_status_idx" ON "Order"("isDeleted", "status");
CREATE INDEX IF NOT EXISTS "Order_externalId_idx" ON "Order"("externalId");
CREATE INDEX IF NOT EXISTS "Order_phone_idx" ON "Order"("phone");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");

-- Rider code + unique constraints
ALTER TABLE "Rider" ADD COLUMN IF NOT EXISTS "code" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Rider_code_key" ON "Rider"("code");

-- Unique national ID / driving licence (allow multiple nulls)
CREATE UNIQUE INDEX IF NOT EXISTS "Rider_nationalId_key" ON "Rider"("nationalId") WHERE "nationalId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Rider_drivingLicenceNo_key" ON "Rider"("drivingLicenceNo") WHERE "drivingLicenceNo" IS NOT NULL;

-- Default new riders to AVAILABLE (existing OFFLINE rows are left as-is)
-- ALTER is informational; Prisma default handles new inserts

-- Audit log table
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "previousValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_userId_fkey'
  ) THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
