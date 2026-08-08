import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

export const env = {
  port: parseInt(process.env.PORT || "4000", 10),
  databaseUrl: required("DATABASE_URL", "file:./dev.db"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || "30", 10),
  tokenEncryptionKey: required(
    "TOKEN_ENCRYPTION_KEY",
    "0000000000000000000000000000000000000000000000000000000000000000"
  ),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",

  /**
   * Shopify App configuration.
   *
   * SHOPIFY_APP_URL / PUBLIC_BACKEND_URL:
   *   Public base URL of THIS backend (e.g. https://zucchini-backend.onrender.com).
   *   NOT the customer storefront (https://zucchini.co.ke).
   *   Used to build OAuth redirect_uri and webhook callback URLs.
   *
   * SHOPIFY_REDIRECT_URI:
   *   Optional explicit override. Default: {SHOPIFY_APP_URL}/api/shopify/callback
   *   Must match the Allowed redirection URL in the Shopify Partner app settings.
   */
  shopifyClientId: process.env.SHOPIFY_CLIENT_ID || "",
  shopifyClientSecret: process.env.SHOPIFY_CLIENT_SECRET || "",
  shopifyAppUrl: (process.env.SHOPIFY_APP_URL || process.env.PUBLIC_BACKEND_URL || "").replace(/\/$/, ""),
  publicBackendUrl: (process.env.PUBLIC_BACKEND_URL || process.env.SHOPIFY_APP_URL || "").replace(/\/$/, ""),
  shopifyRedirectUri: process.env.SHOPIFY_REDIRECT_URI || "",
};
