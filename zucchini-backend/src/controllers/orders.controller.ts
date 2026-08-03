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
    // Avoid joining merchant to be resilient if Merchant table isn't present.
  });

  res.json({ ok: true, data: orders, items: orders, total: orders.length });
});

export const getMyOrders = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.user?.riderId) throw new ApiError(400, "This account is not linked to a rider");
  const orders = await prisma.order.findMany({
    where: { riderId: req.user.riderId, status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ ok: true, data: orders });
});

export const getOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
  });
  if (!order) throw new ApiError(404, "Order not found");
  res.json({ ok: true, data: order });
});

// Manual order creation from the Dispatch page — pickup/destination coordinates
// come from the frontend's map-based LocationPicker.
export const createOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = createOrderSchema.parse(req.body);

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
    status: "NEW",
    source: "MANUAL",
    externalId: body.externalId,
  };

  if (merchant && merchant.id) orderData.merchantId = merchant.id;

  try {
    const order = await prisma.order.create({ data: orderData });

    getIO()?.emit("order:created", order);
    res.status(201).json({ ok: true, data: order, order });
  } catch (e: any) {
    if (e?.code === "P2002" && e?.meta?.target?.includes("externalId")) {
      throw new ApiError(409, "An order with that order number already exists");
    }

    console.error("createOrder failed:", (e && e.message) || e, { orderData });
    throw e;
  }
});

// A dispatcher transcribes an order that arrived as a WhatsApp message from
// Zucchini. Same shape as a manual order, tagged source=WHATSAPP so reports
// can break down order volume by channel (Shopify vs WhatsApp vs manual).
export const createWhatsappOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = whatsappOrderSchema.parse(req.body);

  // WhatsApp orders must include an externalId provided by the dispatcher
  if (!body.externalId) {
    throw new ApiError(400, "externalId (order number) is required for WhatsApp orders");
  }

  let merchant: any = undefined;
  try {
    merchant = body.merchantId
      ? await prisma.merchant.findUnique({ where: { id: body.merchantId } })
      : await getOrCreateDefaultMerchant();
  } catch (e) {
    console.warn("Merchant lookup failed during WhatsApp order creation, proceeding without merchant:", (e as any)?.message || e);
    merchant = undefined;
  }

  const noteParts = [body.notes, body.waSenderPhone ? `WhatsApp sender: ${body.waSenderPhone}` : null,
    body.waMessageExcerpt ? `Message: "${body.waMessageExcerpt.slice(0, 300)}"` : null]
    .filter(Boolean);

  // Normalize aliases: accept lat/lng as pickup coords
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
    notes: noteParts.join(" | ") || undefined,
    status: "NEW",
    source: "WHATSAPP",
    externalId: body.externalId,
  };

  if (merchant && merchant.id) orderData.merchantId = merchant.id;

  try {
    const order = await prisma.order.create({ data: orderData });

    getIO()?.emit("order:created", order);
    res.status(201).json({ ok: true, data: order });
  } catch (e: any) {
    if (e?.code === "P2002" && e?.meta?.target?.includes("externalId")) {
      throw new ApiError(409, "An order with that order number already exists");
    }

    console.error("createWhatsappOrder failed:", (e && e.message) || e, { orderData });
    throw e;
  }
});

export const assignOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { riderId } = assignOrderSchema.parse(req.body);

  const rider = await prisma.rider.findUnique({ where: { id: riderId } });
  if (!rider) throw new ApiError(404, "Rider not found");
  if (rider.status === "SUSPENDED") throw new ApiError(409, "Rider is suspended");

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { riderId, status: "ASSIGNED" },
    include: { rider: true },
  }).catch((e) => {
    console.error("assignOrder failed:", (e && e.message) || e, { orderId: req.params.id, riderId });
    throw new ApiError(404, "Order not found");
  });

  await prisma.rider.update({ where: { id: riderId }, data: { status: "BUSY" } });

  getIO()?.emit("order:updated", order);
  res.json({ ok: true, data: order });
});

// Unassign rider from order (used by frontend RemoveRiderDialog)
export const unassignOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const orderId = req.params.id;
  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) throw new ApiError(404, "Order not found");

  const prevRiderId = existing.riderId;

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { riderId: null, status: "NEW" },
  }).catch(() => {
    throw new ApiError(404, "Order not found");
  });

  // Free previous rider if no longer has active orders
  if (prevRiderId) {
    const stillBusy = await prisma.order.count({
      where: { riderId: prevRiderId, status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } },
    });
    if (stillBusy === 0) {
      await prisma.rider.update({ where: { id: prevRiderId }, data: { status: "AVAILABLE" } }).catch(() => {
        console.warn("Failed to update rider status after unassign", prevRiderId);
      });
    }
  }

  getIO()?.emit("order:updated", order);
  getIO()?.emit("order:unassigned", order);

  res.json({ ok: true, data: order });
});

// update bulkUploadCsv to require externalId per row for WhatsApp CSVs
export const bulkUploadCsv = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ApiError(400, "No CSV file uploaded");

  const merchantId = req.body?.merchantId;
  let merchant: any = undefined;
  try {
    merchant = merchantId
      ? await prisma.merchant.findUnique({ where: { id: merchantId } })
      : await getOrCreateDefaultMerchant();
  } catch (e) {
    console.warn("Merchant lookup failed during CSV import, proceeding without merchant:", (e as any)?.message || e);
    merchant = undefined;
  }

  const rows = parseCsv(file.buffer.toString("utf8"));

  let imported = 0;
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.customername || !row.phone || !row.address) {
        throw new Error("customerName, phone, and address are required");
      }

      // require externalId for WhatsApp CSV imports (row.externalid case-insensitive)
      const externalId = row.externalid || row.externalId || row.orderid || row.orderid?.toString();
      if (!externalId) {
        throw new Error("externalId (order number) is required in CSV for WhatsApp orders");
      }

      // ensure uniqueness
      const exists = await prisma.order.findUnique({ where: { externalId: String(externalId) } });
      if (exists) {
        throw new Error(`Order number ${externalId} already exists`);
      }

      await prisma.order.create({
        data: {
          merchantId: merchant?.id ?? undefined,
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
          externalId: String(externalId),
        },
      });
      imported++;
    } catch (e: any) {
      errors.push({ row: i + 2, error: e.message }); // +2: header row + 1-indexing
    }
  }

  if (imported > 0) {
    getIO()?.emit("orders:bulk-imported", { merchantId: merchant?.id, count: imported });
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
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { podUrl },
    }).catch(() => {
      throw new ApiError(404, "Order not found");
    });

    res.json({ ok: true, data: order });
  } catch (e: any) {
    console.error("uploadPod failed:", (e && e.message) || e, { orderId: req.params.id, podUrl });
    throw e;
  }
});
