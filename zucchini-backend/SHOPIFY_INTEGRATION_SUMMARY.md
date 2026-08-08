# Shopify Integration — Implementation Notes

## Public backend
- Production: `https://zucchini-backend.onrender.com`
- OAuth install: `GET /api/shopify/install?shop={shop}.myshopify.com`
- OAuth callback: `GET /api/shopify/callback`
- Webhook: `POST /api/shopify/webhooks/orders-create`

## Environment variables
| Variable | Required for Shopify | Meaning |
|----------|---------------------|---------|
| SHOPIFY_CLIENT_ID | Yes | Partner app Client ID |
| SHOPIFY_CLIENT_SECRET | Yes | Partner app Client Secret (also used for webhook HMAC) |
| SHOPIFY_APP_URL | Yes | **This backend’s** public URL (e.g. https://zucchini-backend.onrender.com) — NOT zucchini.co.ke |
| PUBLIC_BACKEND_URL | Recommended | Same as SHOPIFY_APP_URL; used for webhook registration |
| SHOPIFY_REDIRECT_URI | Optional | Defaults to `{SHOPIFY_APP_URL}/api/shopify/callback` |
| TOKEN_ENCRYPTION_KEY | Yes | Encrypts stored Shopify access tokens |
| DATABASE_URL | Yes | Postgres |
| JWT_ACCESS_SECRET | Yes | Signs OAuth state JWT |

## Order mapping
- `externalId` = `shopify:{shopify_order_id}` (unique, idempotent)
- Manual dispatcher numbers (`ORD-…`) are never overwritten or auto-generated for Shopify imports
- Source = `SHOPIFY`

## Scopes requested
- `read_orders`
- `read_customers`

## Tests
```bash
npm run test:shopify
```
