import AsyncStorage from "@react-native-async-storage/async-storage";
import client from "../api/client";
import { endpoints } from "../api/endpoints";

export interface RiderUser {
  id: string;
  name: string;
  phone: string;
  role: string;
  riderId?: string | null;
}

interface LoginResponse {
  ok: boolean;
  accessToken: string;
  refreshToken: string;
  user: RiderUser;
}

export const login = async (phone: string, password: string): Promise<RiderUser> => {
  const { data } = await client.post<LoginResponse>(endpoints.auth.login, { phone, password });
  if (!data.ok) throw new Error("Login failed");

  await AsyncStorage.setItem("accessToken", data.accessToken);
  await AsyncStorage.setItem("refreshToken", data.refreshToken);
  await AsyncStorage.setItem("user", JSON.stringify(data.user));

  return data.user;
};

export const getStoredUser = async (): Promise<RiderUser | null> => {
  const raw = await AsyncStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
};

export const logout = async (): Promise<void> => {
  await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
};
