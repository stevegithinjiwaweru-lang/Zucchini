import { io, Socket } from "socket.io-client";
import { ensureArray } from "../utils/normalize";
import { queryClient } from "../lib/queryClient";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://zucchini-backend.onrender.com";

let socket: Socket | null = null;

export const initSocket = (): Socket => {
  if (socket) return socket;

  const token = localStorage.getItem("accessToken");

  socket = io(SOCKET_URL, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000,
    auth: {
      token,
    },
  });

  socket.on("connect", () => {
    try {
      console.log("🟢 Socket connected:", socket?.id);

      socket?.emit("join", {
        role: "DISPATCHER",
      });
    } catch (err) {
      console.error("Socket connect handler error", err);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket disconnected:", reason);
  });

  socket.on("connect_error", (err: any) => {
    console.error("❌ Socket connection error:", err?.message || err);
  });

  socket.on("reconnect", (attempt) => {
    console.log(`🟢 Socket reconnected after ${attempt} attempt(s)`);
  });

  // Generic orders update - safe merge
  socket.on("orders:update", (payload: unknown) => {
    try {
      const updates = ensureArray(payload);
      if (!updates.length) return;

      queryClient.setQueryData(["dispatchOrders"], (old: any = []) => {
        const oldArr = Array.isArray(old) ? old : [];
        const merged = [...updates, ...oldArr];
        const uniq = new Map();
        return merged.filter((it: any) => {
          if (!it || !it.id) return false;
          if (uniq.has(it.id)) return false;
          uniq.set(it.id, true);
          return true;
        });
      });

      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      console.error("Error handling orders:update socket event", err);
    }
  });

  // Specific order events - invalidate lists
  const refreshLists = () => {
    try {
      queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      console.error("Error invalidating queries from socket events", err);
    }
  };

  socket.on("order:assigned", refreshLists);
  socket.on("order:unassigned", refreshLists);
  socket.on("order:status:update", refreshLists);

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (!socket) return;

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};
