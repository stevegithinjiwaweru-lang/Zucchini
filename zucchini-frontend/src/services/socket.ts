import { io, Socket } from "socket.io-client";
import { message } from "antd";
import { ensureArray } from "../utils/normalize";
import { queryClient } from "../lib/queryClient";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://zucchini-backend.onrender.com";

let socket: Socket | null = null;

function orderLabel(payload: any): string {
  return payload?.orderNumber || payload?.externalId || "Order";
}

function refreshLists() {
  try {
    queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["ordersPage"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-live-stats"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });
    queryClient.invalidateQueries({ queryKey: ["deletedOrders"] });
    queryClient.invalidateQueries({ queryKey: ["riders"] });
  } catch (err) {
    console.error("Error invalidating queries from socket events", err);
  }
}

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
    auth: { token },
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket?.id);
    socket?.emit("join", { role: "DISPATCHER" });
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  socket.on("connect_error", (err: any) => {
    console.error("Socket connection error:", err?.message || err);
  });

  // List refresh (colon + dot event names)
  const events = [
    "order:created",
    "order.created",
    "order:updated",
    "order.updated",
    "order:assigned",
    "order.assigned",
    "order:reassigned",
    "order.reassigned",
    "order:unassigned",
    "order:status:update",
    "order:deleted",
    "order.deleted",
    "order:restored",
    "order.restored",
    "order:completed",
    "order.completed",
    "rider:created",
    "rider.created",
    "rider:updated",
    "rider.updated",
    "rider:deleted",
    "rider.deleted",
    "dashboard:updated",
    "dashboard.updated",
  ];
  events.forEach((ev) => socket!.on(ev, refreshLists));

  // Dispatcher notifications
  socket.on("order.assigned", (p: any) => {
    message.info(`${orderLabel(p)} assigned${p?.rider?.name ? ` to ${p.rider.name}` : ""}`);
  });
  socket.on("order:assigned", (p: any) => {
    /* refresh already handled; avoid double toast if both fire — only toast on dotted */
  });
  socket.on("order.completed", (p: any) => {
    message.success(`${orderLabel(p)} delivered`);
  });
  socket.on("order.deleted", (p: any) => {
    message.warning(`${orderLabel(p)} deleted`);
  });
  socket.on("order.created", (p: any) => {
    message.success(`New order ${orderLabel(p)}`);
  });

  socket.on("orders:update", (payload: unknown) => {
    try {
      const updates = ensureArray(payload);
      if (!updates.length) return;
      queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      console.error("Error handling orders:update", err);
    }
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};
