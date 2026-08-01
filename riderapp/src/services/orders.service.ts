import client from "../api/client";
import { endpoints } from "../api/endpoints";

export interface RiderOrder {
  id: string;
  customerName: string;
  phone?: string;
  address: string;
  destination?: string;
  distance?: number;
  scheduledAt?: string | null;
  status: string;
  createdAt: string;
  lat?: number;
  lng?: number;
  [key: string]: any;
}

// Orders assigned to the logged-in rider (mirrors the "Rider Application" side
// of the workflow: the rider only ever sees their own assigned deliveries).
export const getMyOrders = async (): Promise<RiderOrder[]> => {
  const { data } = await client.get(endpoints.orders.getMine);
  return Array.isArray(data) ? data : data?.items || [];
};

export const getOrder = async (id: string): Promise<RiderOrder> => {
  const { data } = await client.get(endpoints.orders.getOne(id));
  return data?.order || data;
};

export const updateOrderStatus = async (id: string, status: string) => {
  const { data } = await client.patch(endpoints.orders.updateStatus(id), { status });
  return data;
};

// Proof of delivery photo upload (multipart). Field name must be "file" to
// match the backend's podUpload.single("file") — previously this sent "pod",
// which the backend didn't look for, so every upload would have failed.
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
