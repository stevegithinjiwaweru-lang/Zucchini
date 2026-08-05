import { Response } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  assignOrderSchema,
  whatsappOrderSchema,
  updateOrderSchema,
} from "../utils/schemas";
import { AuthedRequest } from "../middleware/auth";
import { getIO } from "../socket";
import { parseCsv } from "../utils/csv";
import { OrderStatus } from "@prisma/client";

// The frontend's dispatch board currently queries status=PENDING, which isn't
// one of our real statuses (NEW/ASSIGNED/.../RETURNED). We treat PENDING as an
// alias for NEW so unassigned orders still show up — see README for the
// one-line frontend fix to send NEW directly instead.
function normalizeStatusFilter(status?: string) {
  if (!status) return undefined as OrderStatus | undefined;
  if (status === "PENDING") return OrderStatus.NEW;
  return status as OrderStatus;
}

// Helper to add orderNumber alias to order object
function augmentOrder(order: any) {
  if (!order) return order;
  return { ...order, orderNumber: order.externalId ?? null };
}

// Try to find or create the default merchant, but fail gracefully if the
// database doesn't have the Merchant table or migrations aren't applied yet.
async function getOrCreateDefaultMerchant() {
  try {
    let merchant = await prisma.merchant.findFirst();
    if (!merchant) {
      merchant = await prisma.merchant.create({
        data: { name: "Zucchini", connector: "APP", status: "CONNECTED" },
      });
    }
    return merchant;
  } catch (e) {
    // Log and return undefined so callers can continue without a merchant.
    console.warn("Merchant lookup/creation failed, continuing without merchant:", (e as any)?.message || e);
    return undefined as any;
  }
}

export const listOrders = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { status, riderId, merchantId, source, search, orderNo, dateFrom, dateTo } =
    req.query as Record<string, string>;
  const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
  const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);

  const where: any = {};
  const normalizedStatus = normalizeStatusFilter(status);
  if (normalizedStatus) where.status = normalizedStatus;
  if (riderId) where.riderId = riderId;
  if (merchantId) where.merchantId = merchantId;
  if (source) where.source = source;

  // Search by the dispatcher's own order number (externalId) or customer
  // name — "orderNo" and "search" are treated as the same free-text query,
  // since the frontend sends both.
  const q = (search || orderNo || "").trim();
  if (q) {
    where.OR = [
      { externalId: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(`${dateFrom}T00:00:00.000Z`);
    if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: "desc" },
      // Avoid joining merchant to be resilient if Merchant table isn't present.
    }),
    prisma.order.count({ where }),
  ]);

  const mapped = orders.map(augmentOrder);
  res.json({ ok: true, data: mapped, items: mapped, total, page, limit });
});

export const getMyOrders = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.user?.riderId) throw new ApiError(400, "This account is not linked to a rider");
  const orders = await prisma.order.findMany({
    where: { riderId: req.user.riderId, status: { in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT] } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ ok: true, data: orders.map(augmentOrder) });
});

export const getOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
  });
  if (!order) throw new ApiError(404, "Order not found");
  res.json({ ok: true, data: augmentOrder(order) });
});

// Update order (safe partial updates)
export const updateOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const body = updateOrderSchema.parse(req.body) as any;

  // Map alias
  if (!body.externalId && body.orderNumber) body.externalId = body.orderNumber;

  if (body.externalId) {
    const existing = await prisma.order.findUnique({ where: { externalId: body.externalId } });
    if (existing && existing.id !== id) throw new ApiError(409, "An order with that order number already exists");
  }

  const data: any = {
    customerName: body.customerName,
    phone: body.phone,
    address: body.address,
    destination: body.destination,
    notes: body.notes,
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    paymentType: body.paymentType,
    status: body.status as OrderStatus | undefined,
    externalId: body.externalId,
  };

  const toUpdate = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));

  const order = await prisma.order.update({ where: { id }, data: toUpdate }).catch(() => {
    throw new ApiError(404, "Order not found");
  });

  const augmented = augmentOrder(order);
  getIO()?.emit("order:updated", augmented);
  res.json({ ok: true, data: augmented });
});

// Manual order creation from the Dispatch page — pickup/destination coordinates
// come from the frontend's map-based LocationPicker.
export const createOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = createOrderSchema.parse(req.body);

  // Accept orderNumber alias
  if (!body.externalId && (body as any).orderNumber) (body as any).externalId = (body as any).orderNumber;

  // externalId MUST be provided by the caller for manual orders. We don't
  // generate server-side order numbers to avoid surprises — dispatchers and
  // WhatsApp importers must provide their own unique order numbers.
  if (!body.externalId) {
    throw new ApiError(400, "externalId (order number) is required for manual orders");
  }

  // If caller provided an external/order number, ensure it's not already used
  const already = await prisma.order.findUnique({ where: { externalId: body.externalId } });
  if (already) {
    // 409 Conflict - caller should choose a different order number
    throw new ApiError(409, "An order with that order number already exists");
  }

  let merchant: any = undefined;
  try {
    merchant = body.merchantId
      ? await prisma.merchant.findUnique({ where: { id: body.merchantId } })
      : await getOrCreateDefaultMerchant();
  } catch (e) {
    // If merchant lookup fails, continue without a merchant.
    console.warn("Merchant lookup failed during order creation, proceeding without merchant:", (e as any)?.message || e);
    merchant = undefined;
  }

  // Normalize aliases: frontend sometimes sends lat/lng instead of pickupLat/pickupLng
  const pickupLatVal = body.pickupLat ?? body.lat ?? undefined;
  const pickupLngVal = body.pickupLng ?? body.lng ?? undefined;

  const orderData: any = {
    customerName: body.customerName,
    phone: body.phone,
    address: body.address,
    destination: body.destination,
    pickupLat: pickupLatVal,
    pickupLng: pickupLngVal,
    destinationLat: body.destinationLat,
    destinationLng: body.destinationLng,
    lat: pickupLatVal,
    lng: pickupLngVal,
    amount: body.amount,
    paymentType: body.paymentType,
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
    notes: body.notes,
    status: OrderStatus.NEW,
    source: "MANUAL",
    externalId: body.externalId,
  };

  if (merchant && merchant.id) orderData.merchantId = merchant.id;

  try {
    const order = await prisma.order.create({ data: orderData });

    getIO()?.emit("order:created", augmentOrder(order));
    res.status(201).json({ ok: true, data: augmentOrder(order), order: augmentOrder(order) });
  } catch (e: any) {
    if (e?.code === "P2002" && e?.meta?.target?.includes("externalId")) {
      throw new ApiError(409, "An order with that order number already exists");
    }

    console.error("createOrder failed:", (e && e.message) || e, { orderData });
    throw e;
  }
});

// --- BEGIN: Added handlers to satisfy routes and provide basic behavior ---

// Permanently delete an order
export const deleteOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const order = await prisma.order.delete({ where: { id } });
    getIO()?.emit("order:deleted", augmentOrder(order));
    res.json({ ok: true });
  } catch (e: any) {
    // Prisma delete for non-existent record throws P2025
    if (e?.code === "P2025") throw new ApiError(404, "Order not found");
    throw e;
  }
});

// Assign an order to a rider
export const assignOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const body = assignOrderSchema.parse(req.body) as any; // { riderId: string }
  const update = {
    riderId: body.riderId,
    status: OrderStatus.ASSIGNED,
  };
  const order = await prisma.order.update({ where: { id }, data: update }).catch(() => {
    throw new ApiError(404, "Order not found");
  });
  const augmented = augmentOrder(order);
  getIO()?.emit("order:assigned", augmented);
  res.json({ ok: true, data: augmented });
});

// Unassign an order from a rider
export const unassignOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const order = await prisma.order.update({ where: { id }, data: { riderId: null, status: OrderStatus.NEW } }).catch(() => {
    throw new ApiError(404, "Order not found");
  });
  const augmented = augmentOrder(order);
  getIO()?.emit("order:unassigned", augmented);
  res.json({ ok: true, data: augmented });
});

// Update order status (PATCH /:id/status)
export const updateOrderStatus = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const body = updateOrderStatusSchema.parse(req.body) as any; // { status: string }
  const order = await prisma.order.update({ where: { id }, data: { status: body.status as OrderStatus } }).catch(() => {
    throw new ApiError(404, "Order not found");
  });
  const augmented = augmentOrder(order);
  getIO()?.emit("order:status:update", augmented);
  res.json({ ok: true, data: augmented });
});

// Create WhatsApp order (minimal behavior: similar to createOrder but source=WHATSAPP)
export const createWhatsappOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = whatsappOrderSchema.parse(req.body) as any;

  // Accept orderNumber alias
  if (!body.externalId && body.orderNumber) body.externalId = body.orderNumber;

  if (!body.externalId) {
    throw new ApiError(400, "externalId (order number) is required for WhatsApp orders");
  }

  const already = await prisma.order.findUnique({ where: { externalId: body.externalId } });
  if (already) {
    throw new ApiError(409, "An order with that order number already exists");
  }

  const orderData: any = {
    customerName: body.customerName,
    phone: body.phone,
    address: body.address,
    destination: body.destination,
    amount: body.amount,
    paymentType: body.paymentType,
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
    notes: body.notes,
    status: OrderStatus.NEW,
    source: "WHATSAPP",
    externalId: body.externalId,
  };

  try {
    const order = await prisma.order.create({ data: orderData });
    getIO()?.emit("order:created", augmentOrder(order));
    res.status(201).json({ ok: true, data: augmentOrder(order) });
  } catch (e: any) {
    if (e?.code === "P2002" && e?.meta?.target?.includes("externalId")) {
      throw new ApiError(409, "An order with that order number already exists");
    }
    throw e;
  }
});

// Bulk CSV upload (stub for now)
export const bulkUploadCsv = asyncHandler(async (req: AuthedRequest, res: Response) => {
  // multer attached file is req.file
  if (!req.file) throw new ApiError(400, "file is required");
  // parseCsv is available; you could implement parsing + createMany here.
  // For now, return 501 to indicate not implemented.
  res.status(501).json({ ok: false, error: "bulkUploadCsv not implemented on server yet" });
});

// Upload proof-of-delivery (stub for now)
export const uploadPod = asyncHandler(async (req: AuthedRequest, res: Response) => {
  // multer attached file is req.file
  if (!req.file) throw new ApiError(400, "file is required");
  // Implement saving to storage and updating order.podUrl
  res.status(501).json({ ok: false, error: "uploadPod not implemented yet" });
});

// --- END: Added handlers
