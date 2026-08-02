import { Request, Response } from "express";

// Shopify webhooks are disabled while we migrate merchant functionality.
// This endpoint intentionally returns 410 Gone so webhook deliveries are not
// processed until the integration is re-enabled.
export const handleOrdersCreate = (_req: Request, res: Response) => {
  res.status(410).json({ ok: false, message: "Shopify webhooks disabled: merchant integration removed" });
};
