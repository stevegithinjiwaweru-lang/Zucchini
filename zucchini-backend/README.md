# Zucchini Backend

Node.js + Express + TypeScript + Prisma (SQLite). Matches the API contract the
existing frontend (`services/*.ts`, `api/endpoints.ts`) already expects.

## 1. Install & set up the database

```bash
npm install
cp .env.example .env
# Edit .env: generate real random values for JWT_ACCESS_SECRET,
# JWT_REFRESH_SECRET, TOKEN_ENCRYPTION_KEY (32+ random bytes each — e.g.
# `openssl rand -hex 32`).

npx prisma migrate dev --name init
npm run seed
```

The seed script creates the single **Zucchini** merchant plus two logins:

| Role       | Phone      | Password       |
|------------|------------|----------------|
| Admin      | 0700000001 | ChangeMe123!   |
| Dispatcher | 0700000002 | ChangeMe123!   |

Change these passwords after your first login (there's no "change password"
endpoint yet — do it directly in the DB via `npx prisma studio` for now, or
ask me to add one).

## 2. Run it

```bash
npm run dev      # ts-node-dev, auto-reloads
# or
npm run build && npm start
```

Backend listens on `http://localhost:4000` by default. Health check: `GET /health`.

## 3. Point the frontend at it

The frontend's `.env` already has:
```
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

## 4. Connect Zucchini's Shopify store

Shopify's Admin API can't be called securely from a browser, so this has to
go through the backend:

1. In the Shopify admin for Zucchini's store: **Settings → Apps and sales
   channels → Develop apps → Create an app**.
2. Under **Configuration**, grant Admin API scopes: `read_orders`,
   `read_customers` (add `write_orders` only if you later want to push
   status updates back to Shopify).
3. **Install app**, then copy the **Admin API access token** (shown once).
4. Note the shop's `*.myshopify.com` domain.
5. In Zucchini's dashboard: Merchants → connect Shopify → paste the domain
   and token. This calls `POST /api/merchants/:id/connect-shopify`, which
   verifies the token, registers an `orders/create` webhook pointing at
   `PUBLIC_BACKEND_URL/api/shopify/webhooks/orders-create`, and stores the
   access token encrypted at rest (AES-256-GCM, key from
   `TOKEN_ENCRYPTION_KEY`).
6. **Set `PUBLIC_BACKEND_URL`** in `.env` to a publicly reachable URL before
   connecting (Shopify needs to reach the webhook from the internet — use
   ngrok/Cloudflare Tunnel for local dev, or your real domain in production).
7. **Webhook signature verification**: Shopify signs webhooks with the app's
   **Client Secret** (Configuration tab), not a per-webhook value. Right now
   the code generates its own random secret and expects it to match — you'll
   need to either (a) set that app's Client Secret to the value logged when
   you connect, or (b) tell me and I'll wire it to read the real Client
   Secret from `.env` instead. Flagging this now rather than shipping
   something that looks connected but silently fails signature checks.

Once connected, new Shopify orders flow in automatically tagged
`source: SHOPIFY`. Merchants → "Sync now" (`POST /:id/sync`) does a manual
backfill of the last 50 orders in case a webhook was missed.

## 5. WhatsApp orders

Your frontend's Dispatch page already has an "Upload CSV (WhatsApp orders)"
button (`DispatchOrderUpload.tsx`) — that's the real WhatsApp intake flow
(there's no official WhatsApp Business API wired up; dispatchers keep a
running sheet from WhatsApp messages and upload it). I built
`POST /api/orders/upload-csv` to match it exactly:

- Multipart form: `file` (the CSV) + `merchantId`
- CSV columns (case-insensitive, any order): `customerName`, `phone`,
  `address`, `amount`, `paymentType` (COD/PREPAID), `destination`, `lat`,
  `lng`
- Every imported row is tagged `source: WHATSAPP`
- Response includes `imported` count and a per-row `errors` list for bad rows

There's also `POST /api/orders/whatsapp` for single manual entries with the
same tagging, if you'd rather build a one-at-a-time form instead of CSV.

## 6. Known gaps / things worth deciding

- **`PENDING` status**: the frontend's dispatch board queries
  `status=PENDING`, but real order statuses are `NEW/ASSIGNED/PICKED_UP/...`.
  The backend treats `PENDING` as an alias for `NEW` so this works today —
  cleaner long-term fix is updating `dispatch.service.ts` to send `NEW`
  directly.
- **Response envelopes**: your services expect slightly different shapes in
  different places (`data.items`, `data.rider`, `data.order`...). I added
  the aliases each existing service call expects, but a future cleanup pass
  to standardize on one envelope shape would simplify things.
- **No password-change / user-management UI yet** — only the seeded admin/
  dispatcher logins exist. Say the word and I'll add a Settings page + API
  for creating additional dispatcher/admin logins.
- **SQLite** is used for simplicity (zero external setup). Fine for a single
  merchant's volume; if this needs to scale or run multi-instance, swap
  `DATABASE_URL` to Postgres — the Prisma schema doesn't need to change.
