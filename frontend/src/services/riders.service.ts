import client from "../api/client";
import { endpoints } from "../api/endpoints";

export interface Rider {
  id: string;
  name: string;
  phone: string;
  vehicleType?: string;
  vehicleNumber?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface LocationPayload {
  lat: number;
  lng: number;
}

interface RidersResponse {
  ok: boolean;
  items: Rider[];
  page: number;
  limit: number;
}

interface RiderResponse {
  ok: boolean;
  rider: Rider;
}

interface DeleteResponse {
  ok: boolean;
}

export interface LocationResponse {
  ok: boolean;
  rider?: Rider;
  error?: string;
}

export const sendLocation = async (
  riderId: string,
  payload: LocationPayload
): Promise<LocationResponse> => {
  try {
    const { data } = await client.post<LocationResponse>(
      endpoints.riders.locationUpdate(riderId),
      payload
    );

    return data;
  } catch (error) {
    console.error("Failed to send rider location:", error);
    throw error;
  }
};

export const getRiders = async (): Promise<Rider[]> => {
  try {
    const { data } = await client.get<RidersResponse>(
      endpoints.riders.getAll
    );

    return Array.isArray(data.items) ? data.items : [];
  } catch (error) {
    console.error("Failed to fetch riders:", error);
    throw error;
  }
};

export const createRider = async (
  payload: Partial<Rider>
): Promise<Rider> => {
  try {
    const { data } = await client.post<RiderResponse>(
      endpoints.riders.create,
      payload
    );

    return data.rider;
  } catch (error) {
    console.error("Failed to create rider:", error);
    throw error;
  }
};

export const updateRider = async (
  riderId: string,
  payload: Partial<Rider>
): Promise<Rider> => {
  try {
    const { data } = await client.patch<RiderResponse>(
      endpoints.riders.update(riderId),
      payload
    );

    return data.rider;
  } catch (error) {
    console.error("Failed to update rider:", error);
    throw error;
  }
};

export const deleteRider = async (
  riderId: string
): Promise<boolean> => {
  try {
    const { data } = await client.delete<DeleteResponse>(
      endpoints.riders.delete(riderId)
    );

    return data.ok;
  } catch (error) {
    console.error("Failed to delete rider:", error);
    throw error;
  }
};