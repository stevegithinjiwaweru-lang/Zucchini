import { Router } from "express";

// This router exists only to provide clear responses for legacy clients.
// Merchant management has been removed from the platform. Keep a small
// router that returns 410 Gone for all routes so operators get a consistent
// error instead of a crash if the file is ever mounted elsewhere.

const router = Router();

router.use((req, res) => {
  res.status(410).json({ ok: false, message: "Merchants API removed" });
});

export default router;
