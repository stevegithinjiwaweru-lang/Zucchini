fix(orders): use Prisma OrderStatus enum across backend and schemas

Summary
This PR replaces raw order status string literals with the generated Prisma OrderStatus enum throughout the backend and updates Zod validation to return enum values. This fixes TypeScript type errors (TS2322) caused by passing plain strings to Prisma-generated types and makes validation & database usage consistent.

Changes
- Replace status string literals (e.g. "NEW", "ASSIGNED") with OrderStatus.NEW, OrderStatus.ASSIGNED, etc., where Prisma expects the enum.
- Update Zod schemas to use z.nativeEnum(OrderStatus) so parsed values are the enum members Prisma expects.

Files touched (high-level)
- zucchini-backend/src/utils/schemas.ts
- zucchini-backend/src/controllers/orders.controller.ts
- zucchini-backend/src/controllers/dispatch.controller.ts
- zucchini-backend/src/services/shopify.service.ts
- zucchini-backend/src/controllers/riders.controller.ts

How to verify locally
1. In the backend package:
   npm install
   npx prisma generate
   npm run build

2. Smoke-test endpoints:
   - POST /api/orders (create manual order) → expect status "NEW"
   - POST /api/orders/:id/assign → expect status "ASSIGNED"
   - PATCH /api/orders/:id/status → apply and verify updates

Notes
- Frontend string literals remain unchanged (enum values serialize to the same strings at runtime). If desired later, frontend types can be updated to share types with the backend.
