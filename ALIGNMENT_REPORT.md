# Frontend / Backend / Rider App Alignment

## Auth
| Client | Path | Backend |
|--------|------|---------|
| Web + Rider | POST /auth/login | ✓ phone + password, JWT |
| Rider alias | POST /auth/rider/login | ✓ same handler |
| Both | GET /auth/me | ✓ |
| Both | POST /auth/logout | ✓ |

## Orders
| Action | Frontend | Rider app | Backend |
|--------|----------|-----------|---------|
| List | GET /orders | — | ✓ (+ soft-delete filter) |
| Create manual | POST /orders | — | ✓ orderNumber required |
| Create WhatsApp | POST /orders/whatsapp | — | ✓ |
| CSV | POST /orders/upload-csv | — | ✓ |
| Assign | POST /orders/:id/assign | — | ✓ capacity/offline checks |
| Unassign | POST /orders/:id/unassign | — | ✓ |
| Edit | PUT /orders/:id | — | ✓ number locked after assign |
| Soft delete | DELETE /orders/:id | — | ✓ |
| Restore | POST /orders/:id/restore | — | ✓ + Deleted Orders UI |
| Status | PATCH /orders/:id/status | same | ✓ |
| Mine | — | GET /orders/mine?scope=all | ✓ active + completed |
| Dashboard stats | GET /orders/stats/dashboard | — | ✓ |

## Riders
| Action | Web | Rider app | Backend |
|--------|-----|-----------|---------|
| List/create/update/delete | ✓ | — | ✓ ADMIN/DISPATCHER |
| Location | optional | POST /riders/:id/location | ✓ |

## Known non-features (handled gracefully)
- **Merchants API** → 410 Gone; UI catches errors / empty list
- **Ratings API** → missing; falls back to dashboard stats / empty list
- **WhatsApp** → manual transcription UI, not Meta webhook

## Order number contract
- Stored as `externalId`; API always returns `orderNumber` + `externalId`
- UI helper `getOrderDisplayNumber` / rider `displayOrderNumber` never show system ids
