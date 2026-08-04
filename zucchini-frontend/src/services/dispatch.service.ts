import client from "../api/client";
import { ensureArray } from "../utils/normalize";

export interface DispatchOrder {
  id: string;
  customerName: string;
  phone?: string;
  address?: string;
  destination?: string;
  amount?: number;
  status?: string;
  riderId?: string | null;
  createdAt?: string;
  scheduledAt?: string | null;
  lat?: number | null;
  lng?: number | null;
  merchant?: {
    id: string;
    name: string;
  };
  rider?: {
    id: string;
    name: string;
  } | null;
  [key: string]: any;
}

/**
 * Fetch orders waiting for dispatch
 * Backend: GET /api/orders?status=NEW
 */
export const fetchPendingDispatchOrders = async (params?: Record<string, any>): Promise<DispatchOrder[]> => {
  const response = await client.get("/orders", { params: { status: "NEW", limit: 200, ...params } });
  // client normalizes response.data to an array; still ensureArray as a double-guard
  return ensureArray(response.data);
};

/**
 * Assign rider to dispatch order
 * Backend: POST /api/orders/:id/assign  (body: { riderId })
 */
export const assignOrder = async (
  orderId: string,
  riderId: string
) => {
  const response = await client.post(
    `/orders/${orderId}/assign`,
    {
      riderId,
    }
  );

  return response.data;
};

/**
 * Permanently delete an order
 * Backend: DELETE /api/orders/:id
 */
export const deleteOrder = async (orderId: string) => {
  const response = await client.delete(`/orders/${orderId}`);
  return response.data;
};

/**
 * Fetch available riders
 * Backend: GET /api/riders
 */
export const fetchRiders = async () => {
  const response = await client.get("/riders");
  return ensureArray(response.data);
};

/**
 * Create manual WhatsApp/manual order
 * Backend: POST /api/orders
 */
export const createOrder = async (
  payload: any
) => {
  const response = await client.post(
    "/orders",
    payload
  );

  return response.data;
};
