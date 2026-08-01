import { z } from "zod";

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
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  destinationLat: z.number().optional(),
  destinationLng: z.number().optional(),
  amount: z.number().nonnegative().default(0),
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
  lat: z.number(),
  lng: z.number(),
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
