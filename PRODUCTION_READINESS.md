# Production Readiness — Implementation Notes

## Apply database migration

```bash
cd zucchini-backend
npx prisma migrate deploy
# or for local:
npx prisma db push
npx prisma generate
```

Migration `20260806_production_readiness` adds:

- Order soft-delete: `isDeleted`, `deletedAt`, `deletedBy`, `needsOrderNumberReview`
- Rider `code` (RD001…) + unique `nationalId` / `drivingLicenceNo`
- `AuditLog` table

## Legacy order numbers (one-time)

```bash
cd zucchini-backend
npx ts-node --project scripts/tsconfig.json scripts/migrate-legacy-orders.ts
```

Assigns `LEGACY-000001`… for rows missing a real order number and sets `needsOrderNumberReview = true`. **Never** overwrites valid `externalId` values.

## Soft delete

- `DELETE /api/orders/:id` → soft delete
- `POST /api/orders/:id/restore` → restore
- List/get queries exclude `isDeleted: true` unless `includeDeleted=true` (admin/dispatcher)

## Audit trail

Service: `src/services/audit.service.ts`  
Logged actions: order create/edit/assign/reassign/status/deliver/cancel/delete/restore, rider create/update/delete.

## Order number lock

After assignment or status past `NEW`, order number cannot be changed (API + UI).

## Assignment guards

Blocks offline / suspended riders and riders with ≥ 4 active deliveries.

## Dashboard

`GET /api/orders/stats/dashboard` + socket events `dashboard.updated` / `order.*` / `rider.*`

## Rider defaults

- Status: **AVAILABLE**
- Code: **RD001**, **RD002**, …
- Phone: Kenyan format validation
- Password: min 8, bcrypt hashed
