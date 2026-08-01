import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "./utils/jwt";
import { env } from "./config/env";

let io: Server | undefined;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing auth token"));
    try {
      verifyAccessToken(token);
      next();
    } catch {
      next(new Error("Invalid auth token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {
      // no-op for now; room-based subscriptions can be added here later
    });
  });

  return io;
}

export function getIO(): Server | undefined {
  return io;
}
