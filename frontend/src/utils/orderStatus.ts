// Maps the backend's order status codes to the display wording from the
// Order Tracking spec (Pending, Assigned, Accepted, Arrived at Pickup,
// Picked Up, In Transit, Delivered, Delivery Failed, Cancelled).
//
// NOTE: "Accepted" and "Arrived at Pickup" are in the spec but the backend
// does not currently appear to emit those as distinct statuses (only
// PENDING/CREATED, ASSIGNED, PICKED_UP, EN_ROUTE/IN_TRANSIT, ARRIVED,
// DELIVERED, FAILED, CANCELLED were seen in the codebase). Until the
// backend adds those states, this mapping only affects display label +
// color — it does not change which codes are sent to/filtered against
// the API, so it's safe even if the backend's exact status set changes.
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
  PENDING: "default",
  CREATED: "default",
  NEW: "default",
  ASSIGNED: "gold",
  ACCEPTED: "gold",
  ARRIVED: "orange",
  ARRIVED_AT_PICKUP: "orange",
  PICKED_UP: "orange",
  EN_ROUTE: "blue",
  IN_TRANSIT: "blue",
  DELIVERED: "green",
  FAILED: "red",
  DELIVERY_FAILED: "red",
  RETURNED: "red",
  CANCELLED: "default",
};

export const orderStatusLabel = (status?: string | null): string => {
  if (!status) return "—";
  return ORDER_STATUS_LABELS[status] || status;
};

export const orderStatusColor = (status?: string | null): string => {
  if (!status) return "default";
  return ORDER_STATUS_COLORS[status] || "default";
};

// The full spec status list, in order, for use in filter dropdowns.
export const ORDER_STATUS_FILTER_OPTIONS = [
  { label: "Assigned", value: "ASSIGNED" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Arrived at Pickup", value: "ARRIVED" },
  { label: "Picked Up", value: "PICKED_UP" },
  { label: "In Transit", value: "IN_TRANSIT" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Delivery Failed", value: "FAILED" },
  { label: "Cancelled", value: "CANCELLED" },
];
