import http from "http";
import app from "./app";
import { initSocket } from "./socket";
import { env } from "./config/env";

const server = http.createServer(app);
initSocket(server);

server.listen(env.port, () => {
  console.log(`Zucchini backend listening on http://localhost:${env.port}`);
});
