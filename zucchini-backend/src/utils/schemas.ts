import { z } from "zod";

// helper to coerce numeric-like values (strings) into numbers for lenient API intake
// Accept any Zod schema (number, optional, defaulted, etc.) so callers can pass
// z.number(), z.number().optional(), or z.number().nonnegative().default(0).
const coerceNumber = (schema: z.ZodTypeAny) =>
  z.preprocess((val) => {
    if (typeof val === "string") {
      const t = val.trim();
      if (t === "") return undefined;
      const n = Number(t);
      return Number.isNaN(n) ? val : n;
    }
    return val;
  }, schema);

export const loginSchema = z.object({
  phone: z.string().min(6),
  password: z.string().min(4),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const createOrderSchema = z.object({
  merchantId: z.string().optional(), // defaults to the single Zucchini merchant if omitted
  customerName: z.string().min(1),
  phone: z.string().min(6),
  address: z.string().min(1),
  destination: z.string().optional(),
  pickupLat: coerceNumber(z.number().optional()),
  pickupLng: coerceNumber(z.number().optional()),
  destinationLat: coerceNumber(z.number().optional()),
  destinationLng: coerceNumber(z.number().optional()),
  // Accept flat lat/lng as aliases (frontend sometimes sends lat/lng)
  lat: coerceNumber(z.number().optional()),
  lng: coerceNumber(z.number().optional()),
  // Require external/order number provided by dispatchers when creating an order
  externalId: z.string().min(1),
  amount: coerceNumber(z.number().nonnegative().default(0)),
  paymentType: z.enum(["COD", "PREPAID"]).default("COD"),
  scheduledAt: z.string().datetime().optional().nullable(),
  notes: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "NEW",
    "ASSIGNED",
    "PICKED_UP",
    "IN_TRANSIT",
    "DELIVERED",
    "FAILED",
    "RETURNED",
  ]),
});

export const assignOrderSchema = z.object({
  riderId: z.string().min(1),
});

export const createRiderSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  nationalId: z.string().optional(),
  drivingLicenceNo: z.string().optional(),
  bikeReg: z.string().optional(),
  vehicleType: z.string().optional(),
  branch: z.string().optional(),
  password: z.string().min(4).optional(), // if provided, creates a login for the rider app
});

export const updateRiderSchema = createRiderSchema.partial();

export const riderLocationSchema = z.object({
  lat: coerceNumber(z.number()),
  lng: coerceNumber(z.number()),
});

// Manual WhatsApp order entry — a dispatcher transcribes an order that came in
// as a WhatsApp message from the merchant (Zucchini currently takes orders over
// WhatsApp as well as Shopify), tagging its source for reporting.
export const whatsappOrderSchema = createOrderSchema.extend({
  waSenderPhone: z.string().optional(),
  waMessageExcerpt: z.string().max(2000).optional(),
});

export const connectShopifySchema = z.object({
  shopDomain: z
    .string()
    .min(4)
    .regex(/\.myshopify\.com$/, "Must be a *.myshopify.com domain"),
  accessToken: z.string().min(10),
});

// New schema for partial order updates (Edit Order)
export const updateOrderSchema = z.object({
  externalId: z.string().min(1).optional(),
  customerName: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  destination: z.string().optional(),
  merchantId: z.string().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  amount: coerceNumber(z.number().nonnegative()).optional(),
  distance: coerceNumber(z.number().nonnegative()).optional(),
});