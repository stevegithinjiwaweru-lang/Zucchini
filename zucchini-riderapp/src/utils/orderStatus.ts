// Mirrors src/utils/orderStatus.ts in the Easybox web dashboard so both apps
// show identical status wording per the Order Tracking spec.
import { COLORS } from "../theme/colors";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CREATED: "Pending",
  NEW: "Pending",
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  ARRIVED: "Arrived at Pickup",
  ARRIVED_AT_PICKUP: "Arrived at Pickup",
  PICKED_UP: "Picked Up",
  EN_ROUTE: "In Transit",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  FAILED: "Delivery Failed",
  DELIVERY_FAILED: "Delivery Failed",
  RETURNED: "Delivery Failed",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: COLORS.muted,
  CREATED: COLORS.muted,
  NEW: COLORS.muted,
  ASSIGNED: COLORS.warning,
  ACCEPTED: COLORS.warning,
  ARRIVED: COLORS.serious,
  ARRIVED_AT_PICKUP: COLORS.serious,
  PICKED_UP: COLORS.serious,
  EN_ROUTE: COLORS.primary,
  IN_TRANSIT: COLORS.primary,
  DELIVERED: COLORS.good,
  FAILED: COLORS.critical,
  DELIVERY_FAILED: COLORS.critical,
  RETURNED: COLORS.critical,
  CANCELLED: COLORS.muted,
};

export const orderStatusLabel = (status?: string | null): string => {
  if (!status) return "—";
  return ORDER_STATUS_LABELS[status] || status;
};

export const orderStatusColor = (status?: string | null): string => {
  if (!status) return COLORS.muted;
  return ORDER_STATUS_COLORS[status] || COLORS.muted;
};

// The sequence a rider moves an assigned order through. Must exactly match
// the backend's Prisma OrderStatus enum (NEW/ASSIGNED/PICKED_UP/IN_TRANSIT/
// DELIVERED/FAILED/RETURNED) — there is no ACCEPTED or ARRIVED status in the
// database, so those intermediate steps were removed to avoid every status
// update being rejected by the backend.
export const RIDER_STATUS_FLOW: { from: string; next: string; label: string }[] = [
  { from: "ASSIGNED", next: "PICKED_UP", label: "Mark Picked Up" },
  { from: "PICKED_UP", next: "IN_TRANSIT", label: "Start Delivery" },
  { from: "IN_TRANSIT", next: "DELIVERED", label: "Mark Delivered" },
];
