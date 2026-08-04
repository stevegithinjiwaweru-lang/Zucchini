# Zucchini — Render Deployment Guide

Three apps here:

| App | What it is | Where it runs |
|---|---|---|
| `zucchini-backend` | Express + Prisma + Socket.io API | Render **Web Service** |
| `zucchini-frontend` | React/Vite dispatcher dashboard | Render **Static Site** |
| `zucchini-riderapp` | Expo/React Native rider app | **Not Render** — builds to an `.apk` via EAS (Render only hosts web servers/sites, not mobile builds) |

## What I changed before this was deployable

1. **SQLite → PostgreSQL.** The backend was configured with `DATABASE_URL="file:./dev.db"` (SQLite). Render's filesystem is ephemeral on every service type at the free tier, and even paid disks don't survive a redeploy the way you'd want for a real database. I switched `prisma/schema.prisma` to `postgresql` and hand-wrote the initial migration (`prisma/migrations/20260801000000_init/`) since there was no database available here to run `prisma migrate dev` against. This migration matches the schema exactly — you don't need to regenerate it.
2. **`package.json` scripts** (backend):
   - `postinstall: prisma generate` — so the Prisma client is (re)built on every Render deploy.
   - `start: prisma migrate deploy && node dist/seed.js && node dist/server.js` — Render's free tier has no shell access to run one-off jobs, so migrations and seeding now run automatically on every boot. `seed.ts` is already idempotent (it checks for existing records before creating), so this is safe to run repeatedly.
   - Added `engines.node >= 20`.
3. **Added a `.gitignore`** to the frontend — it didn't have one (`node_modules`, `dist`, `.env` were previously untracked-but-unprotected).
4. **`render.yaml`** — a Blueprint that provisions the Postgres database, backend, and frontend together in one shot.

Nothing else was structurally broken — routes, controllers, auth middleware, the CORS/raw-body-before-JSON ordering for Shopify webhooks, and the frontend's API/socket clients were already written correctly and already read their URLs from env vars rather than hardcoding `localhost`.

## Deploy steps

1. **Push this to a Git repo** (GitHub/GitLab/Bitbucket) with this folder structure at the root:
   ```
   render.yaml
   zucchini-backend/
   zucchini-frontend/
   ```
   (Leave `zucchini-riderapp/` out of this repo, or put it in its own — it's not part of the Render blueprint.)

2. **Render Dashboard → New → Blueprint**, point it at the repo. Render reads `render.yaml` and shows you three resources: `zucchini-db` (Postgres), `zucchini-backend`, `zucchini-frontend`. Click **Apply**.

3. **First deploy will fail CORS until you close the loop:** once `zucchini-frontend` is live, copy its URL (e.g. `https://zucchini-frontend.onrender.com`) into `zucchini-backend`'s environment variable `CORS_ORIGIN` in the dashboard (it's marked `sync: false` in the blueprint on purpose, so it prompts you instead of guessing). Saving it triggers an automatic redeploy of the backend.

4. **Log in** with the seeded accounts (change these immediately after — see `seed.ts`):
   - Admin: `0700000001` / `ChangeMe123!`
   - Dispatcher: `0700000002` / `ChangeMe123!`

5. **Rider app:** set `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_SOCKET_URL` in `zucchini-riderapp/.env` (or as EAS build secrets) to your backend's Render URL, e.g. `https://zucchini-backend.onrender.com`, then build per `riderapp/APK_BUILD_GUIDE.md`.

## Known limitations to be aware of

- **Free Postgres expires in 30 days.** Fine for testing; before real production traffic, upgrade the database plan (Starter is $6-7/mo) so it doesn't get deleted.
- **Free web services spin down after 15 min idle** and take ~30-60s to wake back up on the next request — including the socket connection. Expect a slow first load after inactivity while testing. Upgrade to a paid instance to remove this.
- **Proof-of-delivery photo uploads are not persistent on the free tier.** `podUpload` in `src/utils/uploads.ts` writes files to local disk (`/uploads`). Render's free tier has no persistent disk, so uploaded POD photos disappear on every redeploy/restart. For real production you have two options:
  - Attach a Render persistent disk (requires a paid "Starter" instance, $7/mo) and mount it at the upload path, or
  - Switch `podUpload`'s storage to S3/Cloudinary/similar object storage (more work, but multi-instance-safe and doesn't disappear on redeploy).
  I didn't make this change since it needs real cloud storage credentials from you — happy to wire it up if you tell me which provider you want.
- **750 free instance-hours/month** are shared across all your free services on a workspace — fine for one backend + one static site, but worth knowing if you add more.

## Local dev

Backend now expects Postgres locally too (previously SQLite):
```
docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
cp .env.example .env   # then edit DATABASE_URL etc.
npm install
npm run prisma:migrate
npm run seed
npm run dev
```
Frontend is unchanged: `cp .env.example .env && npm install && npm run dev`.
