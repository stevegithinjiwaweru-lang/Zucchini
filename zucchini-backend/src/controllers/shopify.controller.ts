// Shopify webhooks are disabled after merchant removal. Return 410 Gone so
// any external webhook deliveries receive a clear response.
import { Request, Response } from "express";

export const handleOrdersCreate = (_req: Request, res: Response) => {
  res.status(410).json({ ok: false, message: "Shopify webhooks disabled: merchant integration removed" });
};
