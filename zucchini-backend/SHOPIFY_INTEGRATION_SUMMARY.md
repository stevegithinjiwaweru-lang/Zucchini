# Shopify integration — progress summary

This file summarizes what has been implemented so far for the Shopify integration (feature/shopify-prod-ready work in progress) and what remains before a production merge to `main`.

IMPORTANT: This file is committed to the repository on the default branch (main) for visibility. The full production-readiness changes are implemented on the feature branch `feature/shopify-prod-ready` and have NOT been merged into `main`.

---

Completed work (committed)

- Types
  - `zucchini-backend/src/types/shopify.ts` — TypeScript interfaces for Shopify responses and order payloads.

- OAuth & Webhook code (initial implementation)
  - `zucchini-backend/src/controllers/shopify.oauth.controller.ts` — Shopify OAuth install (/api/shopify/install) and callback (/api/shopify/callback) handlers. Handles state signing, HMAC verification of callback, token exchange, encryption and storage of access token into Merchant, and best-effort webhook registration.
  - `zucchini-backend/src/services/shopify.oauth.service.ts` — helper for authenticated Shopify Admin API requests (shopifyRequest) and convenience helpers (fetchShopifyOrders, registerOrdersCreateWebhook).
  - `zucchini-backend/src/controllers/shopify.controller.ts` — webhook handler for orders/create (HMAC verification and importShopifyOrder invocation). Replaced previous 410 stub.
  - `zucchini-backend/src/routes/shopify.routes.ts` — wired routes for /install, /callback and /webhooks/orders-create.

- App & infra changes (feature branch)
  - `zucchini-backend/tsconfig.json` — added DOM lib for global fetch typing (Node 20+ support).
  - `zucchini-backend/src/app.ts` — wired cookie parsing and request-id middleware on the feature branch.
  - `zucchini-backend/src/middleware/requestId.ts` — lightweight request ID middleware (UUID v4); committed to feature branch.

- Security and persistence
  - Tokens are encrypted using existing `encryptSecret` helper before being saved to `prisma.merchant.shopifyAccessTokenEnc` (implementation present in the OAuth controller).
  - Shop domain validation included in controller logic.

- Minor frontend changes (committed earlier)
  - `zucchini-frontend/src/components/dispatch/CreateOrderModal.tsx` — added optional `externalId` input.
  - `zucchini-frontend` other components updated to support new order flow where applicable (UI changes were minimal and backward compatible).

Files created/modified on the feature branch `feature/shopify-prod-ready`

- Added/modified (branch):
  - zucchini-backend/src/app.ts (cookie-parser, request-id wiring)
  - zucchini-backend/tsconfig.json (DOM lib)
  - zucchini-backend/src/middleware/requestId.ts
  - zucchini-backend/src/controllers/shopify.oauth.controller.ts
  - zucchini-backend/src/services/shopify.oauth.service.ts
  - zucchini-backend/src/controllers/shopify.controller.ts
  - zucchini-backend/src/routes/shopify.routes.ts
  - zucchini-backend/src/config/env.ts (SHOPIFY_* values present previously; FRONTEND_ADMIN_URL planned)

What remains (work in progress on feature/shopify-prod-ready)

- Remove `node-fetch` imports and fully rely on Node 20+ global `fetch`.
- Replace manual cookie parsing with `cookie-parser` usage throughout controllers and ensure state cookie uses secure/httpOnly & correct SameSite settings.
- Expand OAuth scopes to include `write_orders` in addition to `read_orders` and `read_customers`.
- Redirect OAuth callback to configured frontend admin URL (e.g. `FRONTEND_ADMIN_URL/shopify-connected`) with success/error query params and add a small frontend page to display results.
- Improve webhook reliability:
  - Retry webhook registration with exponential backoff and jitter on transient failures.
  - Verify webhook signatures exactly according to Shopify docs (base64 HMAC) and OAuth callback hmac per spec.
  - Ensure idempotent order import and safely ignore duplicate webhook deliveries.
- Strengthen CSRF/state validation:
  - Make state tokens single-use by storing a short-lived record (Prisma migration required for a small `ShopifyState` table) to prevent replay.
- Observability & logging:
  - Add a structured logger (pino) and replace console.* with logger usage.
  - Include request IDs in Shopify-related logs.
- Automated tests:
  - Add Jest + supertest tests for OAuth install, callback, token exchange, HMAC verification, order import, duplicate webhook handling.
- Cleanups:
  - Remove dead code and unused imports, fix TypeScript and ESLint warnings, run `npm run build` and ensure zero TypeScript errors.

Database changes required

- A small Prisma model is recommended for single-use OAuth state enforcement (example model `ShopifyState` with `jti`, `shop`, `used`, `expiresAt`) which will require a migration if you want the single-use state protection. No other schema changes are required for token storage — existing `Merchant` fields are used:
  - `prisma.merchant.shopifyAccessTokenEnc` (stored encrypted token)
  - `prisma.merchant.shopifyWebhookSecret` (per-merchant webhook signing secret)

Status regarding merging to `main`

- The feature branch `feature/shopify-prod-ready` contains the in-progress production-readiness changes. Some files were already committed to `main` earlier (types, initial controllers, service), but the full production-readiness work is on `feature/shopify-prod-ready` and has NOT been merged into `main`.
- Per your earlier instructions, merging to `main` will only be done after build/test/lint checks pass and you approve the PR. This summary file is the only change committed directly to `main` in order to provide an up-to-date status for reviewers.

How to proceed

If you want me to complete the remaining work and open a PR (I will not merge), confirm and I will:

1. Finish the remaining implementation tasks on `feature/shopify-prod-ready`.
2. Add the small Prisma migration for single-use state (if confirmed).
3. Add Jest tests and run `npm run build` and `npm test` locally, fix all failures.
4. Push the branch and open a PR with build/test/lint status.

If you want me to merge to `main` now instead, explicitly confirm and I will perform the merge; NOTE: merging before tests and E2E validation is risky and not recommended.

---

Committed to: zucchini-backend/SHOPIFY_INTEGRATION_SUMMARY.md
