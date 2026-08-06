/**
 * Local mirrors of Prisma enums so TypeScript compiles even if
 * `prisma generate` failed (offline / ECONNRESET to binaries.prisma.sh).
 * Values must match prisma/schema.prisma exactly.
 */
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
