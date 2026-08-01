import client from "../api/client";

export interface DispatchOrder {
  id: string;
  customerName: string;
  phone?: string;
  address?: string;
  pickup?: string;
  destination?: string;
  amount?: number;
  status?: string;
  riderId?: string | null;
  createdAt?: string;
  scheduledAt?: string | null;
  lat?: number | null;
  lng?: number | null;
  [key: string]: any;
}

export const fetchPendingDispatchOrders = async (params: any = {}) => {
  const response = await client.get("/orders", { params: { ...params, status: "PENDING", limit: params.limit || 50 } });
  return response.data;
};

export const assignOrder = async (orderId: string, riderId: string) => {
  // backend has POST /orders/:id/assign
  const response = await client.post(`/orders/${orderId}/assign`, { riderId });
  return response.data;
};

export const fetchRiders = async (params: any = {}) => {
  const response = await client.get("/riders", { params: { limit: params.limit || 200 } });
  return response.data;
};

export const createOrder = async (payload: any) => {
  const response = await client.post('/orders', payload);
  return response.data;
};
