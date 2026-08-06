# Run from zucchini-backend folder:
#   powershell -ExecutionPolicy Bypass -File .\APPLY_FIXES.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Creating src/types/enums.ts ..."
New-Item -ItemType Directory -Force -Path src\types | Out-Null
@'
export enum OrderStatus {
  NEW = "NEW",
  ASSIGNED = "ASSIGNED",
  PICKED_UP = "PICKED_UP",
  IN_TRANSIT = "IN_TRANSIT",
  DELIVERED = "DELIVERED",
  FAILED = "FAILED",
  RETURNED = "RETURNED",
}
export enum RiderStatus {
  AVAILABLE = "AVAILABLE",
  BUSY = "BUSY",
  OFFLINE = "OFFLINE",
  SUSPENDED = "SUSPENDED",
  IN_DELIVERY = "IN_DELIVERY",
}
export enum PaymentType {
  COD = "COD",
  PREPAID = "PREPAID",
}
export enum OrderSource {
  MANUAL = "MANUAL",
  SHOPIFY = "SHOPIFY",
  WHATSAPP = "WHATSAPP",
  CSV = "CSV",
}
'@ | Set-Content -Encoding utf8 src\types\enums.ts

Write-Host "Fixing OrderStatus imports ..."
foreach ($f in @(
  "src\controllers\dispatch.controller.ts",
  "src\controllers\orders.controller.ts",
  "src\services\shopify.service.ts"
)) {
  if (Test-Path $f) {
    (Get-Content $f -Raw) -replace 'import \{ OrderStatus \} from "@prisma/client";', 'import { OrderStatus } from "../types/enums";' | Set-Content -Encoding utf8 $f
    Write-Host "  patched $f"
  }
}

Write-Host "Fixing riders transaction types ..."
if (Test-Path "src\controllers\riders.controller.ts") {
  $c = Get-Content "src\controllers\riders.controller.ts" -Raw
  $c = $c -replace 'import type \{ PrismaClient \} from "@prisma/client";\r?\n', ''
  $c = $c -replace 'type Tx = Omit<PrismaClient[^;]+;\r?\n', ''
  $c = $c -replace 'async \(tx(?::\s*typeof prisma)?\)\s*=>', 'async (tx: any) =>'
  $c = $c -replace 'async \(tx: typeof prisma\)\s*=>', 'async (tx: any) =>'
  Set-Content -Encoding utf8 "src\controllers\riders.controller.ts" $c
  Write-Host "  patched riders.controller.ts"
}

Write-Host "Fixing dashboard implicit any ..."
if (Test-Path "src\controllers\orders.controller.ts") {
  $c = Get-Content "src\controllers\orders.controller.ts" -Raw
  $c = $c -replace '\.filter\(\(o\) => o\.deliveredAt\)', '.filter((o: { deliveredAt: Date | null }) => !!o.deliveredAt)'
  $c = $c -replace '\.map\(\(o\) => \(o\.deliveredAt!\.getTime\(\) - o\.createdAt\.getTime\(\)\) / 60000\)', '.map((o: { deliveredAt: Date | null; createdAt: Date }) => (o.deliveredAt!.getTime() - o.createdAt.getTime()) / 60000)'
  $c = $c -replace 'mins\.reduce\(\(a, b\) => a \+ b, 0\)', 'mins.reduce((a: number, b: number) => a + b, 0)'
  Set-Content -Encoding utf8 "src\controllers\orders.controller.ts" $c
  Write-Host "  patched orders.controller.ts"
}

Write-Host ""
Write-Host "Done. Now run:"
Write-Host "  npm run build"
Write-Host "  npx prisma generate   # retry until network succeeds"
Write-Host "  npx prisma migrate deploy"
Write-Host "  npm run seed"
Write-Host "  npm run dev"
