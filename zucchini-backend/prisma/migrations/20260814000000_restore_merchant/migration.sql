-- Restore Merchant table for Shopify integration

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'MerchantStatus'
  ) THEN
    CREATE TYPE "MerchantStatus" AS ENUM (
      'CONNECTED',
      'DISCONNECTED'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'Connector'
  ) THEN
    CREATE TYPE "Connector" AS ENUM (
      'CSV',
      'API',
      'APP'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "Merchant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "connector" "Connector" NOT NULL DEFAULT 'APP',
  "status" "MerchantStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "shopifyShopDomain" TEXT,
  "shopifyAccessTokenEnc" TEXT,
  "shopifyWebhookSecret" TEXT,
  "lastSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS
"Merchant_shopifyShopDomain_key"
ON "Merchant"("shopifyShopDomain");

ALTER TABLE "Order"
ADD CONSTRAINT "Order_merchantId_fkey"
FOREIGN KEY ("merchantId")
REFERENCES "Merchant"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;