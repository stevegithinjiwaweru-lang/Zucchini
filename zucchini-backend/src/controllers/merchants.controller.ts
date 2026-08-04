import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";

// Merchants endpoints have been removed. Return 410 Gone for all merchant
// management requests so clients receive a clear response instead of a crash.

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
