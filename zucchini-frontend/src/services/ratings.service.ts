import client from "../api/client";
import { ensureArray } from "../utils/normalize";

export interface Rating {
  id: string;
  reviewer?: string;
  rating: number;
  comment?: string;
  createdAt?: string;
  targetId?: string;
}

export interface RatingMetrics {
  totalDeliveries: number;
  activeRiders: number;
  pendingOrders: number;
  completedOrders: number;
  averageRating: number;
  failedDeliveries: number;
}

/**
 * Ratings API is not implemented on the backend yet.
 * Fall back to dashboard order stats so the page does not crash.
 */
export const fetchRatings = async (_params?: Record<string, any>): Promise<Rating[]> => {
  try {
    const res = await client.get("/ratings", { params: _params });
    return ensureArray(res.data);
  } catch {
    return [];
  }
};

export const fetchRatingMetrics = async (): Promise<RatingMetrics> => {
  try {
    const res = await client.get("/ratings/metrics");
    const payload = res.data?.data || res.data?.metrics || res.data || {};
    return {
      totalDeliveries: payload.totalDeliveries ?? payload.todaysTotalDeliveries ?? 0,
      activeRiders: payload.activeRiders ?? payload.availableRiders ?? 0,
      pendingOrders: payload.pendingOrders ?? 0,
      completedOrders: payload.completedOrders ?? payload.deliveredToday ?? 0,
      averageRating: payload.averageRating ?? 0,
      failedDeliveries: payload.failedDeliveries ?? payload.cancelledToday ?? 0,
    };
  } catch {
    // Fallback: derive from dashboard stats endpoint
    try {
      const res = await client.get("/orders/stats/dashboard");
      const d = res.data?.data || res.data || {};
      return {
        totalDeliveries: d.todaysTotalDeliveries ?? 0,
        activeRiders: (d.availableRiders ?? 0) + (d.busyRiders ?? 0),
        pendingOrders: d.pendingOrders ?? 0,
        completedOrders: d.deliveredToday ?? 0,
        averageRating: 0,
        failedDeliveries: d.cancelledToday ?? 0,
      };
    } catch {
      return {
        totalDeliveries: 0,
        activeRiders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        averageRating: 0,
        failedDeliveries: 0,
      };
    }
  }
};
