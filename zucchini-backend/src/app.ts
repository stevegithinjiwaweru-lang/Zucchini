import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { UPLOAD_ROOT } from "./utils/uploads";

// Routes
import authRoutes from "./routes/auth.routes";
import orderRoutes from "./routes/orders.routes";
import riderRoutes from "./routes/riders.routes";
import merchantRoutes from "./routes/merchants.routes";
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
app.use(
  "/uploads",
  express.static(UPLOAD_ROOT)
);


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
app.use("/api/merchants", merchantRoutes);
app.use("/api/dispatches", dispatchRoutes);


// Error handling
app.use(notFoundHandler);
app.use(errorHandler);


export default app;