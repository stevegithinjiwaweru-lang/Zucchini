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


// Shopify Webhooks
// Must remain BEFORE express.json()
// because Shopify HMAC verification requires raw body bytes.
app.use(
  "/api/shopify",
  express.raw({
    type: "application/json",
  }),
  shopifyRoutes
);


// Body parsers
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


// Static files
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
app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/riders",
  riderRoutes
);

app.use(
  "/api/merchants",
  merchantRoutes
);


// Dispatch module
app.use(
  "/api/dispatches",
  dispatchRoutes
);


// Error handlers
app.use(notFoundHandler);

app.use(errorHandler);


export default app;