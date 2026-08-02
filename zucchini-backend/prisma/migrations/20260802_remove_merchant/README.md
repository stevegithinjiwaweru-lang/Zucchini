# Remove Merchant model migration

This migration drops the Merchant model and makes Order.merchantId nullable.

IMPORTANT: This migration is destructive. Do NOT apply to production without a backup.

How to apply (recommended):
1. Create a database backup.
2. Run in a staging environment and run the full test suite.
3. Run the SQL in migration.sql against the database or use `prisma migrate` if you regenerate migrations.
4. Deploy the backend and confirm all endpoints work.

Notes:
- After this migration, merchant data will be gone. Export any data you need before applying.
