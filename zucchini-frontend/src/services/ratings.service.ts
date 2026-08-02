import client from "../api/client";
import { ensureArray } from "../utils/normalize";

export interface Rating {
  id: string;
  reviewer?: string;
  rating: number;
  comment?: string;
  createdAt?: string;
  targetId?: string; // rider or delivery
}

export interface RatingMetrics {
  totalDeliveries: number;
  activeRiders: number;
  pendingOrders: number;
  completedOrders: number;
  averageRating: number;
  failedDeliveries: number;
}

export const fetchRatings = async (params?: Record<string, any>): Promise<Rating[]> => {
  const res = await client.get('/ratings', { params });
  return ensureArray(res.data);
};

export const fetchRatingMetrics = async (): Promise<RatingMetrics> => {
  const res = await client.get('/ratings/metrics');

  // Backend may return { data: { ... } } or { metrics: { ... } } or plain object
  const payload = res.data;

  const metrics = {
    totalDeliveries: payload?.totalDeliveries ?? payload?.total_deliveries ?? payload?.total ?? 0,
    activeRiders: payload?.activeRiders ?? payload?.active_riders ?? payload?.riders ?? 0,
    pendingOrders: payload?.pendingOrders ?? payload?.pending ?? 0,
    completedOrders: payload?.completedOrders ?? payload?.completed ?? 0,
    averageRating: payload?.averageRating ?? payload?.avg_rating ?? payload?.average ?? 0,
    failedDeliveries: payload?.failedDeliveries ?? payload?.failed ?? 0,
  };

  return metrics;
};
