import axios from "axios";
import { normalizeApiResponse } from "../utils/normalize";
import { message } from "antd";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://zucchini-backend.onrender.com/api";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => {
    try {
      // Normalize many backend shapes into a safe array on response.data
      const normalized = normalizeApiResponse(response.data);
      response.data = normalized.data;
    } catch (err) {
      // If anything goes wrong, default to empty array to prevent .map crashes
      response.data = [];
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");

      if (!window.location.pathname.includes("/login")) {
        // show a friendly message and redirect to login
        message.error("Session expired. Please log in again.");
        window.location.replace("/login");
      }
    } else if (status === 403) {
      message.error("Access denied.");
    } else if (status === 404) {
      message.error("Requested resource not found.");
    } else if (status >= 500) {
      message.error("Server error. Please try again later.");
    }

    return Promise.reject(error);
  }
);

export default client;
