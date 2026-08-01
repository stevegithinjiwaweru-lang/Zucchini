import client from "../api/client";

export interface Order {
  id?: string;
  customerName?: string;
  phone?: string;
  address?: string;
  merchantId?: string;
  riderId?: string | null;
  amount?: number;
  paymentType?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  deliveredAt?: string | null;
  [key: string]: any;
}

export const getOrders = async (params: any = {}) => {
  const { data } = await client.get("/orders", { params });
  return data;
};

export const getOrder = async (id: string) => {
  const { data } = await client.get(`/orders/${id}`);
  return data;
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  const { data } = await client.patch(`/orders/${orderId}/status`, { status });
  return data;
};
