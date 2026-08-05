BEGIN;

-- Add forcePasswordChange column if missing, default false
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "forcePasswordChange" boolean DEFAULT false;

-- Set any existing NULL values to false
UPDATE "User" SET "forcePasswordChange" = false WHERE "forcePasswordChange" IS NULL;

-- Enforce NOT NULL to match Prisma schema
ALTER TABLE "User" ALTER COLUMN "forcePasswordChange" SET NOT NULL;

COMMIT;
