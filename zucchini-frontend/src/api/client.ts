import axios from "axios";

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
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => {
    // Normalize list-style responses so frontend code can safely call array helpers.
    // If response.data is an array already, or contains one of the common wrappers,
    // set response.data to the array. Otherwise leave response.data intact for
    // single-resource responses such as { ok: true, data: { ... } }.

    try {
      const body = response.data;

      if (Array.isArray(body)) {
        response.data = body;
        return response;
      }

      const arrayKeys = ["data", "items", "orders", "riders", "results", "rows"];
      for (const k of arrayKeys) {
        if (body && Object.prototype.hasOwnProperty.call(body, k) && Array.isArray(body[k])) {
          response.data = body[k];
          return response;
        }
      }

      // If the body has an "ok" flag and data is an object, keep original shape.
      return response;
    } catch (e) {
      // If normalization fails, just return the original response so callers can
      // handle it explicitly. We don't want normalization to throw.
      return response;
    }
  },
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");

      if (!window.location.pathname.includes("/login")) {
        window.location.replace("/login");
      }
    }

    // If the backend has removed the merchants endpoints we treat GET 410 as
    // an empty array response so UI list fetchers don't crash.
    try {
      const method = error.config?.method?.toLowerCase();
      if (status === 410 && method === "get") {
        return Promise.resolve({ data: [] });
      }
    } catch (e) {
      // ignore
    }

    // For other expected statuses, attach a normalized error shape to make
    // frontend handling easier without throwing raw axios errors.
    if (status === 403 || status === 404 || status === 410 || status === 500) {
      const message = error.response?.data?.message || error.response?.data?.error || error.message;
      const normalized = {
        status,
        message,
        raw: error.response?.data,
      };
      return Promise.reject(normalized);
    }

    return Promise.reject(error);
  }
);

export default client;
