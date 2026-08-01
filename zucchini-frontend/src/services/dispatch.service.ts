import client from "../api/client";


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
 * Backend: GET /api/dispatches
 */
export const fetchPendingDispatchOrders = async (): Promise<DispatchOrder[]> => {
  const response = await client.get("/dispatches");

  if (Array.isArray(response.data)) {
    return response.data;
  }

  console.error(
    "Invalid dispatch response:",
    response.data
  );

  return [];
};


/**
 * Assign rider to dispatch order
 * Backend: POST /api/dispatches/assign
 */
export const assignOrder = async (
  orderId: string,
  riderId: string
) => {
  const response = await client.post(
    "/dispatches/assign",
    {
      orderId,
      riderId,
    }
  );

  return response.data;
};


/**
 * Fetch available riders
 * Backend: GET /api/riders
 */
export const fetchRiders = async () => {
  const response = await client.get("/riders");

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (Array.isArray(response.data?.riders)) {
    return response.data.riders;
  }

  console.error(
    "Invalid riders response:",
    response.data
  );

  return [];
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