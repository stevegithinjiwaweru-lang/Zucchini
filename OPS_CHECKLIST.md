# Operations & Go-Live Checklist

Complete each item before treating production as ready.

---

## 1. End-to-end workflow test

With backend running and DB migrated + seeded:

```bash
cd zucchini-backend
# Apply schema
npx prisma migrate deploy   # or: npx prisma db push
npx prisma generate

# Seed admin, dispatcher, sample riders
npx ts-node src/seed.ts

# Start API (separate terminal)
npm run dev   # or npm start

# Run API E2E
API_BASE=http://localhost:4000/api \
ADMIN_PHONE=0700000001 ADMIN_PASSWORD=ChangeMe123! \
npx ts-node --project scripts/tsconfig.json scripts/e2e-workflow.ts
```

Manual UI path (desktop + mobile browser):

1. Login as dispatcher `0700000002` / `ChangeMe123!`
2. Create order with number `ORD-10025`
3. Confirm same number on **Dispatch**, **Orders**, **Order Details**
4. Assign rider → Reassign → Edit customer → Deliver  
   Confirm number **never** changes
5. Delete order → confirm removed from lists → restore via API if needed
6. Search `ORD-10025`
7. Login rider app with `0711000001` / `ChangeMe123!`

---

## 2. Remove / fix old test orders (legacy numbering)

```bash
cd zucchini-backend

# Inspect only
npx ts-node --project scripts/tsconfig.json scripts/cleanup-legacy-order-numbers.ts

# Soft-delete them
npx ts-node --project scripts/tsconfig.json scripts/cleanup-legacy-order-numbers.ts --delete

# OR assign LEGACY-000001… and flag for review
npx ts-node --project scripts/tsconfig.json scripts/cleanup-legacy-order-numbers.ts --relabel
```

Also available: `scripts/migrate-legacy-orders.ts` (relabel-only).

---

## 3. Verify no screen shows legacy generated IDs

Code rules:

- Display uses `getOrderDisplayNumber()` → only `orderNumber` / `externalId`
- Never uses `id.slice(0, 8)` as an order number
- If value equals system id, UI shows `—`

After deploy, spot-check:

- Orders table
- Dispatch table
- Order detail
- Dashboard recent list
- Reports export columns

---

## 4. Deploy latest code

### Backend (Render — see `render.yaml`)

1. Push this repo / upload latest zip to the connected Git host
2. In Render: **Manual Deploy** → clear build cache if needed
3. Run migrate on the service or one-off shell:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```
4. Confirm env: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` = frontend URL
5. Hit `https://<backend>/health` → `{ ok: true }`

### Frontend

**Render static** (blueprint) or **Vercel**:

```bash
cd zucchini-frontend
# Set VITE_API_BASE_URL (or project env) to backend URL including /api
npm ci && npm run build
# Vercel: vercel --prod
# Render: connected static site auto-builds from rootDir zucchini-frontend
```

Confirm the live site calls the **new** backend (Network tab → `/orders` responses include `orderNumber`).

### Rider app

Set `EXPO_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_SOCKET_URL` to production backend, rebuild APK/EAS.

---

## 5. Back up the production database

**Before** migrate or cleanup:

### Render Postgres

Dashboard → Database → **Backups** (paid plans) or:

```bash
# From a machine that can reach the DB
pg_dump "$DATABASE_URL" -Fc -f "zucchini-backup-$(date +%Y%m%d-%H%M).dump"
```

Store the dump off-platform (S3, encrypted drive).

### Restore (if needed)

```bash
pg_restore -d "$DATABASE_URL" --clean --if-exists zucchini-backup-YYYYMMDD.dump
```

---

## 6. Create admin user (if needed)

```bash
cd zucchini-backend
npx ts-node src/seed.ts
```

Creates (if missing):

| Role       | Phone       | Password       |
|------------|-------------|----------------|
| Admin      | 0700000001  | ChangeMe123!   |
| Dispatcher | 0700000002  | ChangeMe123!   |

**Change passwords immediately** after first login.

---

## 7. Seed initial rider accounts

Same `seed.ts` creates:

| Code  | Name           | Phone       | Password     |
|-------|----------------|-------------|--------------|
| RD00x | James Mwangi   | 0711000001  | ChangeMe123! |
| RD00x | Grace Wanjiku  | 0711000002  | ChangeMe123! |
| RD00x | Peter Ochieng  | 0711000003  | ChangeMe123! |

Or create via **Riders → Add Rider** in the UI (password min 8).

---

## 8. Desktop & mobile browser testing

| Check | Desktop (Chrome/Firefox) | Mobile (Safari/Chrome) |
|-------|--------------------------|-------------------------|
| Login | ☐ | ☐ |
| Create order + order number | ☐ | ☐ |
| Dispatch assign/reassign | ☐ | ☐ |
| Orders edit/delete | ☐ | ☐ |
| Search | ☐ | ☐ |
| Dashboard stats | ☐ | ☐ |
| Reports export | ☐ | ☐ |
| Responsive layout (tables scroll) | ☐ | ☐ |

Use device mode in DevTools plus at least one real phone on production URL.

---

## Suggested order of operations (production)

1. **Backup** database  
2. Deploy **backend** + run `prisma migrate deploy`  
3. Deploy **frontend**  
4. Run **seed** (if empty)  
5. **cleanup-legacy-order-numbers** (dry-run → delete or relabel)  
6. Run **e2e-workflow** against production API  
7. Manual UI checks (desktop + mobile)  
8. Change all default passwords  

---

## What this environment cannot do for you

- Access your live Vercel/Render accounts or production `DATABASE_URL`
- Run browser tests against your deployed URLs without those URLs/credentials
- Create a real offsite backup without your DB connection string

Use the scripts and checklist above on your hosts to finish those steps.
