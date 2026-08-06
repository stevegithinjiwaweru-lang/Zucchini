import client from "../api/client";
import { endpoints } from "../api/endpoints";

export interface RiderOrder {
  id: string;
  orderNumber?: string | null;
  externalId?: string | null;
  customerName: string;
  phone?: string;
  customerPhone?: string;
  address: string;
  pickupLocation?: string;
  destination?: string;
  distance?: number;
  scheduledAt?: string | null;
  deliveredAt?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  lat?: number;
  lng?: number;
  [key: string]: any;
}

export type MyOrdersScope = "active" | "completed" | "all";

export interface MyOrdersResult {
  all: RiderOrder[];
  active: RiderOrder[];
  completed: RiderOrder[];
}

const ACTIVE_STATUSES = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"];
const COMPLETED_STATUSES = ["DELIVERED", "FAILED", "RETURNED"];

function unwrapList(data: any): RiderOrder[] {
  if (Array.isArray(data)) return data;
  return data?.data || data?.items || [];
}

/** Orders for the logged-in rider (active + completed). */
export const getMyOrders = async (scope: MyOrdersScope = "all"): Promise<MyOrdersResult> => {
  const { data } = await client.get(endpoints.orders.getMine, {
    params: { scope, limit: 100 },
  });

  const list = unwrapList(data);
  const activeFromApi = Array.isArray(data?.active) ? data.active : null;
  const completedFromApi = Array.isArray(data?.completed) ? data.completed : null;

  const active =
    activeFromApi || list.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const completed =
    completedFromApi || list.filter((o) => COMPLETED_STATUSES.includes(o.status));

  return {
    all: list,
    active,
    completed,
  };
};

export const getOrder = async (id: string): Promise<RiderOrder> => {
  const { data } = await client.get(endpoints.orders.getOne(id));
  return data?.data || data?.order || data;
};

export const updateOrderStatus = async (id: string, status: string) => {
  const { data } = await client.patch(endpoints.orders.updateStatus(id), { status });
  return data;
};

export const uploadProofOfDelivery = async (id: string, photoUri: string) => {
  const form = new FormData();
  form.append("file", {
    uri: photoUri,
    name: "pod.jpg",
    type: "image/jpeg",
  } as any);

  const { data } = await client.post(endpoints.orders.uploadPod(id), form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

/** Display order number — never the system id. */
export const displayOrderNumber = (order: RiderOrder | null | undefined): string => {
  if (!order) return "—";
  const n = (order.orderNumber || order.externalId || "").trim();
  return n || "—";
};
