import { Response } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  assignOrderSchema,
  whatsappOrderSchema,
} from "../utils/schemas";
import { AuthedRequest } from "../middleware/auth";
import { getIO } from "../socket";
import { parseCsv } from "../utils/csv";

// The frontend's dispatch board currently queries status=PENDING, which isn't
// one of our real statuses (NEW/ASSIGNED/.../RETURNED). We treat PENDING as an
// alias for NEW so unassigned orders still show up — see README for the
// one-line frontend fix to send NEW directly instead.
function normalizeStatusFilter(status?: string) {
  if (!status) return undefined;
  if (status === "PENDING") return "NEW";
  return status;
}

export const listOrders = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { status, riderId, merchantId, source } = req.query as Record<string, string>;
  const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);

  const where: any = {};
  const normalizedStatus = normalizeStatusFilter(status);
  if (normalizedStatus) where.status = normalizedStatus;
  if (riderId) where.riderId = riderId;
  if (merchantId) where.merchantId = merchantId;
  if (source) where.source = source;

  const orders = await prisma.order.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { rider: true },
  });

  res.json({ ok: true, data: orders, items: orders, total: orders.length });
});

export const getMyOrders = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.user?.riderId) throw new ApiError(400, "This account is not linked to a rider");
  const orders = await prisma.order.findMany({
    where: { riderId: req.user.riderId, status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } },
    orderBy: { createdAt: "desc" },
    include: { rider: true },
  });
  res.json({ ok: true, data: orders });
});

export const getOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { rider: true },
  });
  if (!order) throw new ApiError(404, "Order not found");
  res.json({ ok: true, data: order });
});

// Manual order creation from the Dispatch page — pickup/destination coordinates
// come from the frontend's map-based LocationPicker.
export const createOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = createOrderSchema.parse(req.body);

  const order = await prisma.order.create({
    data: {
      merchantId: body.merchantId || null,
      customerName: body.customerName,
      phone: body.phone,
      address: body.address,
      destination: body.destination,
      pickupLat: body.pickupLat,
      pickupLng: body.pickupLng,
      destinationLat: body.destinationLat,
      destinationLng: body.destinationLng,
      lat: body.pickupLat,
      lng: body.pickupLng,
      amount: body.amount,
      paymentType: body.paymentType,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      notes: body.notes,
      status: "NEW",
      source: "MANUAL",
    },
    include: { rider: true },
  });

  getIO()?.emit("order:created", order);
  res.status(201).json({ ok: true, data: order, order });
});

// A dispatcher transcribes an order that arrived as a WhatsApp message from
// Zucchini. Same shape as a manual order, tagged source=WHATSAPP so reports
// can break down order volume by channel (Shopify vs WhatsApp vs manual).
export const createWhatsappOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = whatsappOrderSchema.parse(req.body);

  const noteParts = [
    body.notes,
    body.waSenderPhone ? `WhatsApp sender: ${body.waSenderPhone}` : null,
    body.waMessageExcerpt ? `Message: "${body.waMessageExcerpt.slice(0, 300)}"` : null,
  ].filter(Boolean);

  const order = await prisma.order.create({
    data: {
      merchantId: body.merchantId || null,
      customerName: body.customerName,
      phone: body.phone,
      address: body.address,
      destination: body.destination,
      pickupLat: body.pickupLat,
      pickupLng: body.pickupLng,
      destinationLat: body.destinationLat,
      destinationLng: body.destinationLng,
      lat: body.pickupLat,
      lng: body.pickupLng,
      amount: body.amount,
      paymentType: body.paymentType,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      notes: noteParts.join(" | ") || undefined,
      status: "NEW",
      source: "WHATSAPP",
    },
    include: { rider: true },
  });

  getIO()?.emit("order:created", order);
  res.status(201).json({ ok: true, data: order });
});

export const assignOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { riderId } = assignOrderSchema.parse(req.body);

  const rider = await prisma.rider.findUnique({ where: { id: riderId } });
  if (!rider) throw new ApiError(404, "Rider not found");
  if (rider.status === "SUSPENDED") throw new ApiError(409, "Rider is suspended");

  const order = await prisma.order
    .update({
      where: { id: req.params.id },
      data: { riderId, status: "ASSIGNED" },
      include: { rider: true },
    })
    .catch(() => {
      throw new ApiError(404, "Order not found");
    });

  await prisma.rider.update({ where: { id: riderId }, data: { status: "BUSY" } });

  getIO()?.emit("order:updated", order);
  res.json({ ok: true, data: order });
});

export const updateOrderStatus = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { status } = updateOrderStatusSchema.parse(req.body);

  const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Order not found");

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      status,
      deliveredAt: status === "DELIVERED" ? new Date() : existing.deliveredAt,
    },
    include: { rider: true },
  });

  // Free up the rider once a delivery reaches a terminal state.
  if (["DELIVERED", "FAILED", "RETURNED"].includes(status) && existing.riderId) {
    const stillBusy = await prisma.order.count({
      where: { riderId: existing.riderId, status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } },
    });
    if (stillBusy === 0) {
      await prisma.rider.update({ where: { id: existing.riderId }, data: { status: "AVAILABLE" } });
    }
  }

  getIO()?.emit("order:updated", order);
  res.json({ ok: true, data: order });
});

// Bulk order import from a CSV — this is how dispatchers batch-enter orders
// that came in as WhatsApp messages from Zucchini (they keep a running sheet
// during the day, then upload it). Expected columns (case-insensitive,
// order-independent): customerName, phone, address, amount, paymentType,
// destination, lat, lng. Every imported row is tagged source=WHATSAPP.
export const bulkUploadCsv = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ApiError(400, "No CSV file uploaded");

  const merchantId = req.body?.merchantId || null;

  const rows = parseCsv(file.buffer.toString("utf8"));

  let imported = 0;
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.customername || !row.phone || !row.address) {
        throw new Error("customerName, phone, and address are required");
      }
      await prisma.order.create({
        data: {
          merchantId: merchantId || null,
          customerName: row.customername,
          phone: row.phone,
          address: row.address,
          destination: row.destination || undefined,
          amount: row.amount ? parseFloat(row.amount) : 0,
          paymentType: row.paymenttype?.toUpperCase() === "PREPAID" ? "PREPAID" : "COD",
          lat: row.lat ? parseFloat(row.lat) : undefined,
          lng: row.lng ? parseFloat(row.lng) : undefined,
          pickupLat: row.lat ? parseFloat(row.lat) : undefined,
          pickupLng: row.lng ? parseFloat(row.lng) : undefined,
          status: "NEW",
          source: "WHATSAPP",
        },
      });
      imported++;
    } catch (e: any) {
      errors.push({ row: i + 2, error: e.message }); // +2: header row + 1-indexing
    }
  }

  if (imported > 0) {
    getIO()?.emit("orders:bulk-imported", { merchantId: merchantId || null, count: imported });
  }

  res.status(errors.length && imported === 0 ? 400 : 201).json({
    ok: errors.length === 0,
    imported,
    count: imported,
    errors,
  });
});

export const uploadPod = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ApiError(400, "No file uploaded");

  const podUrl = `/uploads/pod/${file.filename}`;
  const order = await prisma.order
    .update({
      where: { id: req.params.id },
      data: { podUrl },
    })
    .catch(() => {
      throw new ApiError(404, "Order not found");
    });

  res.json({ ok: true, data: order });
});
