import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { UPLOAD_ROOT } from "./utils/uploads";

import authRoutes from "./routes/auth.routes";
import orderRoutes from "./routes/orders.routes";
import riderRoutes from "./routes/riders.routes";
import usersRoutes from "./routes/users.routes";
import shopifyRoutes from "./routes/shopify.routes";
import dispatchRoutes from "./routes/dispatch.routes";
import { handleOrdersCreate } from "./controllers/shopify.controller";
import { install, callback } from "./controllers/shopify.oauth.controller";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);
app.use(morgan("dev"));

/**
 * Shopify webhooks MUST receive the raw body for HMAC verification.
 * Mount ONLY the webhook path with express.raw before express.json().
 */
app.post(
  "/api/shopify/webhooks/orders-create",
  express.raw({ type: "application/json", limit: "2mb" }),
  handleOrdersCreate
);

// OAuth install + callback (query-string based; no special body parser)
app.get("/api/shopify/install", install);
app.get("/api/shopify/callback", callback);

// JSON body parsing for the rest of the API
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(UPLOAD_ROOT));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "zucchini-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/riders", riderRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/merchants", (_req, res) => res.status(410).json({ ok: false, message: "Merchants API removed" }));
app.use("/api/customers", (_req, res) => res.status(410).json({ ok: false, message: "Customers API removed" }));
app.use("/api/dispatches", dispatchRoutes);
// Keep shopify router for any future non-webhook routes (optional)
app.use("/api/shopify", shopifyRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
