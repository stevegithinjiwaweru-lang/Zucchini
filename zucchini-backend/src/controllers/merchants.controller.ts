import { Response } from "express";
import { asyncHandler, ApiError } from "../utils/asyncHandler";

// Merchants endpoints have been removed. These handlers exist only to
// provide explicit 410 responses if they are invoked directly.

export const listMerchants = asyncHandler(async (_req: any, res: Response) => {
  res.status(410).json({ ok: false, message: "Merchants API removed" });
});

export const createMerchant = asyncHandler(async (_req: any, res: Response) => {
  res.status(410).json({ ok: false, message: "Merchants API removed" });
});

export const updateMerchant = asyncHandler(async (_req: any, res: Response) => {
  res.status(410).json({ ok: false, message: "Merchants API removed" });
});

export const connectShopify = asyncHandler(async (_req: any, res: Response) => {
  res.status(410).json({ ok: false, message: "Merchants API removed" });
});

export const syncMerchant = asyncHandler(async (_req: any, res: Response) => {
  res.status(410).json({ ok: false, message: "Merchants API removed" });
});
