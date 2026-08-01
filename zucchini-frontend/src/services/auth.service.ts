import client from "../api/client";
import { endpoints } from "../api/endpoints";

export interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  riderId?: string | null;
}

export interface LoginResponse {
  ok: boolean;
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface MeResponse {
  ok: boolean;
  user: User;
}

export interface LogoutResponse {
  ok: boolean;
}

export const login = async (
  phone: string,
  password: string
): Promise<LoginResponse> => {
  try {
    const { data } = await client.post<LoginResponse>(
      endpoints.auth.login,
      {
        phone,
        password,
      }
    );

    if (!data.ok) {
      throw new Error("Login failed");
    }

    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));

    return data;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const getMe = async (): Promise<User> => {
  try {
    const { data } = await client.get<MeResponse>(
      endpoints.auth.me
    );

    if (!data.ok) {
      throw new Error("Failed to load user");
    }

    return data.user;
  } catch (error) {
    console.error("Failed to fetch current user:", error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  const refreshToken = localStorage.getItem("refreshToken");

  try {
    if (refreshToken) {
      await client.post<LogoutResponse>(
        endpoints.auth.logout,
        {
          refreshToken,
        }
      );
    }
  } catch (error) {
    console.error("Logout failed:", error);
  } finally {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    window.location.href = "/login";
  }
};