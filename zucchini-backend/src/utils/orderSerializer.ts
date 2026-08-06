/**
 * Canonical order shape returned by every order API endpoint.
 * Frontend must always display orderNumber — never invent from system id.
 */
export function serializeOrder(order: any) {
  if (!order) return order;

  const orderNumber = order.externalId ?? order.orderNumber ?? null;
  const rider =
    order.rider != null
      ? {
          id: order.rider.id,
          name: order.rider.name,
          phone: order.rider.phone,
          code: order.rider.code ?? null,
          status: order.rider.status,
        }
      : order.riderId
        ? { id: order.riderId }
        : null;

  return {
    id: order.id,
    orderNumber,
    externalId: order.externalId ?? orderNumber,
    customerName: order.customerName,
    customerPhone: order.phone,
    phone: order.phone,
    pickupLocation: order.address,
    address: order.address,
    destination: order.destination ?? null,
    status: order.status,
    rider,
    riderId: order.riderId ?? null,
    paymentType: order.paymentType,
    amount: order.amount,
    notes: order.notes ?? null,
    source: order.source,
    scheduledAt: order.scheduledAt ?? null,
    deliveredAt: order.deliveredAt ?? null,
    pickupLat: order.pickupLat ?? order.lat ?? null,
    pickupLng: order.pickupLng ?? order.lng ?? null,
    destinationLat: order.destinationLat ?? null,
    destinationLng: order.destinationLng ?? null,
    lat: order.lat ?? order.pickupLat ?? null,
    lng: order.lng ?? order.pickupLng ?? null,
    isDeleted: order.isDeleted ?? false,
    deletedAt: order.deletedAt ?? null,
    needsOrderNumberReview: order.needsOrderNumberReview ?? false,
    merchantId: order.merchantId ?? null,
    merchant: order.merchant ?? null,
    podUrl: order.podUrl ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

/** Statuses after which the order number must not be edited */
export const ORDER_NUMBER_LOCKED_STATUSES = new Set([
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "RETURNED",
]);

export function isOrderNumberLocked(status: string, hasRider?: boolean): boolean {
  if (hasRider) return true;
  return ORDER_NUMBER_LOCKED_STATUSES.has(status);
}

export const MAX_ACTIVE_DELIVERIES = 4;

export const ACTIVE_ORDER_STATUSES = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] as const;
