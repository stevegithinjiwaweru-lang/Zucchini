import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

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
    console.log("🟢 Socket connected:", socket?.id);

    socket?.emit("join", {
      role: "DISPATCHER",
    });
  });

  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Socket connection error:", err.message);
  });

  socket.on("reconnect", (attempt) => {
    console.log(`🟢 Socket reconnected after ${attempt} attempt(s)`);
  });

  return socket;
};

export const getSocket = (): Socket |null => socket;

export const disconnectSocket = (): void => {
  if (!socket) return;

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};