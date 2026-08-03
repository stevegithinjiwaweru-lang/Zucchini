import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { UPLOAD_ROOT } from "./utils/uploads";

// Middleware
import requestId from "./middleware/requestId";
import logger from "./utils/logger";

// Routes
import authRoutes from "./routes/auth.routes";
import orderRoutes from "./routes/orders.routes";
import riderRoutes from "./routes/riders.routes";
// merchants routes removed — merchants are no longer served by the API
import shopifyRoutes from "./routes/shopify.routes";
import dispatchRoutes from "./routes/dispatch.routes";

const app = express();

// Security + logging
app.use(helmet());

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);

// Attach a request id for correlated logs
app.use(requestId());

// Parse cookies
app.use(cookieParser());

// Use morgan for access logs (still enabled) — could route to logger if desired
app.use(morgan("dev"));

// Shopify webhooks
// Keep before express.json() because HMAC verification needs raw body
app.use(
  "/api/shopify",
  express.raw({
    type: "application/json",
  }),
  shopifyRoutes
);

// Body parsing
app.use(
  express.json({
    limit: "2mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

// Static uploads
app.use("/uploads", express.static(UPLOAD_ROOT));

// Health check
app.get(
  "/health",
  (_req, res) => {
    res.json({
      ok: true,
      service: "zucchini-backend",
    });
  }
);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/riders", riderRoutes);
// Merchant API is removed — respond with 410 Gone for legacy clients
app.use("/api/merchants", (_req, res) => res.status(410).json({ ok: false, message: "Merchants API removed" }));
// Customer API (if any legacy paths) respond with 410 Gone
app.use("/api/customers", (_req, res) => res.status(410).json({ ok: false, message: "Customers API removed" }));
app.use("/api/dispatches", dispatchRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
