import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { UPLOAD_ROOT } from "./utils/uploads";

import authRoutes from "./routes/auth.routes";
import orderRoutes from "./routes/orders.routes";
import riderRoutes from "./routes/riders.routes";
import merchantRoutes from "./routes/merchants.routes";
import shopifyRoutes from "./routes/shopify.routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(morgan("dev"));

// IMPORTANT: Shopify webhooks must be mounted with a raw body parser (for HMAC
// verification) BEFORE the global express.json() below, otherwise the body
// would already be parsed/consumed as JSON and the raw bytes would be lost.
app.use("/api/shopify", express.raw({ type: "application/json" }), shopifyRoutes);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(UPLOAD_ROOT));

app.get("/health", (_req, res) => res.json({ ok: true, service: "zucchini-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/riders", riderRoutes);
app.use("/api/merchants", merchantRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
