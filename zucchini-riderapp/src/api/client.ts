import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Point this at the same backend the web dashboard uses.
// Set EXPO_PUBLIC_API_BASE_URL in your environment before building, e.g.:
//   EXPO_PUBLIC_API_BASE_URL=https://api.easybox.example.com
// (This matches the variable name used in .env, .env.example, and README.md —
// previously this file read a different, unused variable name, EXPO_PUBLIC_API_URL,
// so custom .env values were silently ignored.)
const RAW_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:4000";
const API_BASE = `${RAW_BASE.replace(/\/+$/, "")}/api`;

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("accessToken");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
    }
    return Promise.reject(error);
  }
);

export default client;
