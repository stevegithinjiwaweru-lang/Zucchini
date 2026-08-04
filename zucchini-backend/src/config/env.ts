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

  // Shopify OAuth / App configuration (optional in environments that don't use Shopify)
  shopifyClientId: process.env.SHOPIFY_CLIENT_ID || "",
  shopifyClientSecret: process.env.SHOPIFY_CLIENT_SECRET || "",
  shopifyAppUrl: process.env.SHOPIFY_APP_URL || "",
  shopifyRedirectUri: process.env.SHOPIFY_REDIRECT_URI || "",
};
