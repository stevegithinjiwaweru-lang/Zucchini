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

function normalizeStatusFilter(status?: string) {
  if (!status) return undefined;
  if (status === "PENDING") return "NEW";
  return status;
}

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
    console.warn("Merchant lookup/creation failed, continuing without merchant:", (e as any)?.message || e);
    return undefined as any;
  }
}

// List orders with soft-delete exclusion by default. Pass includeDeleted=true (admins only) to include deleted rows.
export const listOrders = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { status, riderId, merchantId, source, search, orderNo, dateFrom, dateTo, includeDeleted } =
    req.query as Record<string, string>;
  const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
  const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);

  const where: any = {};
  const normalizedStatus = normalizeStatusFilter(status);
  if (normalizedStatus) where.status = normalizedStatus;
  if (typeof riderId !== "undefined") {
    // allow explicit null string to mean unassigned (frontend should send riderId=null)
    if (riderId === "null") where.riderId = null;
    else where.riderId = riderId;
  }
  if (merchantId) where.merchantId = merchantId;
  if (source) where.source = source;

  // Exclude soft deleted by default
  const includeDel = String(includeDeleted || "false") === "true";
  if (!includeDel) {
    where.deletedAt = null;
  } else {
    // Only admins may include deleted
    if (req.user?.role !== "ADMIN") delete where.deletedAt; // non-admins can't includeDeleted
  }

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
    }),
    prisma.order.count({ where }),
  ]);

  res.json({ ok: true, data: orders, items: orders, total, page, limit });
});

export const getMyOrders = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.user?.riderId) throw new ApiError(400, "This account is not linked to a rider");
  const orders = await prisma.order.findMany({
    where: { riderId: req.user.riderId, status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] }, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  res.json({ ok: true, data: orders });
});

export const getOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const includeDeleted = String(req.query.includeDeleted || "false") === "true";
  const where: any = { id: req.params.id };
  if (!includeDeleted) where.deletedAt = null;

  const order = await prisma.order.findUnique({
    where,
    include: { activities: { orderBy: { createdAt: "desc" } }, assignments: { orderBy: { assignedAt: "asc" } }, rider: true },
  } as any);
  if (!order) throw new ApiError(404, "Order not found");
  res.json({ ok: true, data: order });
});

export const createOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = createOrderSchema.parse(req.body);
  if (!body.externalId) throw new ApiError(400, "externalId (order number) is required for manual orders");

  const already = await prisma.order.findUnique({ where: { externalId: body.externalId } });
  if (already) throw new ApiError(409, "An order with that order number already exists");

  let merchant: any = undefined;
  try {
    merchant = body.merchantId ? await prisma.merchant.findUnique({ where: { id: body.merchantId } }) : await getOrCreateDefaultMerchant();
  } catch (e) {
    console.warn("Merchant lookup failed during order creation, proceeding without merchant:", (e as any)?.message || e);
    merchant = undefined;
  }

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
    // Create order and activity in a transaction to ensure audit
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({ data: orderData } as any);
      await tx.orderActivity.create({ data: { orderId: order.id, userId: req.user?.id ?? undefined, action: "Order Created", notes: `Created by ${req.user?.name || "system"}` } });
      return order;
    });

    getIO()?.emit("order:created", result);
    res.status(201).json({ ok: true, data: result, order: result });
  } catch (e: any) {
    if (e?.code === "P2002" && e?.meta?.target?.includes("externalId")) {
      throw new ApiError(409, "An order with that order number already exists");
    }
    console.error("createOrder failed:", (e && e.message) || e, { orderData });
    throw e;
  }
});

export const createWhatsappOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = whatsappOrderSchema.parse(req.body);
  if (!body.externalId) throw new ApiError(400, "externalId (order number) is required for WhatsApp orders");

  let merchant: any = undefined;
  try {
    merchant = body.merchantId ? await prisma.merchant.findUnique({ where: { id: body.merchantId } }) : await getOrCreateDefaultMerchant();
  } catch (e) {
    console.warn("Merchant lookup failed during WhatsApp order creation, proceeding without merchant:", (e as any)?.message || e);
    merchant = undefined;
  }

  const noteParts = [body.notes, body.waSenderPhone ? `WhatsApp sender: ${body.waSenderPhone}` : null, body.waMessageExcerpt ? `Message: "${body.waMessageExcerpt.slice(0, 300)}"` : null].filter(Boolean);
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
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({ data: orderData } as any);
      await tx.orderActivity.create({ data: { orderId: order.id, userId: req.user?.id ?? undefined, action: "Order Created (WhatsApp)", notes: `Created by ${req.user?.name || "system"}` } });
      return order;
    });

    getIO()?.emit("order:created", result);
    res.status(201).json({ ok: true, data: result });
  } catch (e: any) {
    if (e?.code === "P2002" && e?.meta?.target?.includes("externalId")) {
      throw new ApiError(409, "An order with that order number already exists");
    }
    console.error("createWhatsappOrder failed:", (e && e.message) || e, { orderData });
    throw e;
  }
});

export const updateOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = updateOrderSchema.parse(req.body);
  const orderId = req.params.id;

  // Validate externalId uniqueness if changing
  if (body.externalId) {
    const exists = await prisma.order.findUnique({ where: { externalId: body.externalId } });
    if (exists && exists.id !== orderId) {
      throw new ApiError(409, "An order with that order number already exists");
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id: orderId }, data: { ...body } as any });
      await tx.orderActivity.create({ data: { orderId: updated.id, userId: req.user?.id ?? undefined, action: "Order Edited", notes: `Edited by ${req.user?.name || "system"}` } });
      return updated;
    });

    getIO()?.emit("order:updated", result);
    res.json({ ok: true, data: result });
  } catch (e: any) {
    console.error("updateOrder failed:", (e && e.message) || e, { orderId, body });
    throw e;
  }
});

export const assignOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { riderId } = assignOrderSchema.parse(req.body);
  const orderId = req.params.id;

  const rider = await prisma.rider.findUnique({ where: { id: riderId } });
  if (!rider) throw new ApiError(404, "Rider not found");
  if (rider.status === "SUSPENDED") throw new ApiError(409, "Rider is suspended");

  try {
    const result = await prisma.$transaction(async (tx) => {
      // update order and create assignment & activity
      const assignment = await tx.orderAssignment.create({ data: { orderId, riderId, assignedById: req.user?.id ?? undefined, note: `Assigned by ${req.user?.name || "system"}` } as any });
      const order = await tx.order.update({ where: { id: orderId }, data: { riderId, status: "ASSIGNED" }, include: { rider: true } as any } as any);
      await tx.rider.update({ where: { id: riderId }, data: { status: "BUSY" } as any });
      await tx.orderActivity.create({ data: { orderId, userId: req.user?.id ?? undefined, action: "Rider Assigned", notes: `Assigned to rider ${rider.name} by ${req.user?.name || "system"}` } as any });
      return { order, assignment };
    });

    // emit socket events
    getIO()?.emit("order:assigned", result.order);
    getIO()?.emit("order:updated", result.order);

    // Invalidate clients will pick up via socket + frontend mutation hooks
    res.json({ ok: true, data: result.order });
  } catch (e: any) {
    console.error("assignOrder failed:", (e && e.message) || e, { orderId, riderId });
    throw e;
  }
});

export const unassignOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const orderId = req.params.id;
  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) throw new ApiError(404, "Order not found");

  const prevRiderId = existing.riderId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // close last assignment for this order
      const lastAssignment = await tx.orderAssignment.findFirst({ where: { orderId, unassignedAt: null }, orderBy: { assignedAt: "desc" } as any });
      if (lastAssignment) {
        await tx.orderAssignment.update({ where: { id: lastAssignment.id }, data: { unassignedAt: new Date() } as any });
      }

      const order = await tx.order.update({ where: { id: orderId }, data: { riderId: null, status: "NEW" } as any });

      if (prevRiderId) {
        const stillBusy = await tx.order.count({ where: { riderId: prevRiderId, status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } } as any });
        if (stillBusy === 0) {
          await tx.rider.update({ where: { id: prevRiderId }, data: { status: "AVAILABLE" } as any });
        }
      }

      await tx.orderActivity.create({ data: { orderId, userId: req.user?.id ?? undefined, action: "Rider Unassigned", notes: `Unassigned by ${req.user?.name || "system"}` } as any });

      return order;
    });

    getIO()?.emit("order:updated", result);
    getIO()?.emit("order:unassigned", result);

    res.json({ ok: true, data: result });
  } catch (e: any) {
    console.error("unassignOrder failed:", (e && e.message) || e, { orderId });
    throw e;
  }
});

export const updateOrderStatus = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { status } = updateOrderStatusSchema.parse(req.body);
  const orderId = req.params.id;

  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) throw new ApiError(404, "Order not found");

  if (req.user?.role === "RIDER") {
    if (!req.user.riderId || existing.riderId !== req.user.riderId) {
      throw new ApiError(403, "This order is not assigned to you");
    }
  }

  const data: any = { status };
  if (status === "DELIVERED") data.deliveredAt = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id: orderId }, data, include: { rider: true } as any } as any);

      // activity
      await tx.orderActivity.create({ data: { orderId, userId: req.user?.id ?? undefined, action: `Status: ${status}`, notes: `Status changed to ${status} by ${req.user?.name || "system"}` } as any });

      // free rider if terminal
      if (["DELIVERED", "FAILED", "RETURNED"].includes(status) && existing.riderId) {
        const stillBusy = await tx.order.count({ where: { riderId: existing.riderId, status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } } as any });
        if (stillBusy === 0) {
          await tx.rider.update({ where: { id: existing.riderId }, data: { status: "AVAILABLE" } as any });
        }
      }

      return updated;
    });

    getIO()?.emit("order:updated", result);
    res.json({ ok: true, data: result });
  } catch (e: any) {
    console.error("updateOrderStatus failed:", (e && e.message) || e, { orderId, status });
    throw e;
  }
});

export const deleteOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const orderId = req.params.id;

  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) throw new ApiError(404, "Order not found");

  const prevRiderId = existing.riderId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const soft = await tx.order.update({ where: { id: orderId }, data: { deletedAt: new Date(), deletedBy: req.user?.id ?? undefined } as any });

      if (prevRiderId) {
        const stillBusy = await tx.order.count({ where: { riderId: prevRiderId, status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } } as any });
        if (stillBusy === 0) {
          await tx.rider.update({ where: { id: prevRiderId }, data: { status: "AVAILABLE" } as any });
        }
      }

      await tx.orderActivity.create({ data: { orderId, userId: req.user?.id ?? undefined, action: "Order Deleted (soft)", notes: `Soft deleted by ${req.user?.name || "system"}` } as any });

      return soft;
    });

    getIO()?.emit("order:deleted", { id: orderId });
    res.json({ ok: true, data: result });
  } catch (e: any) {
    console.error("deleteOrder failed:", (e && e.message) || e, { orderId });
    throw e;
  }
});

export const hardDeleteOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  // Admin-only route; routes should guard this with requireRole("ADMIN")
  const orderId = req.params.id;
  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) throw new ApiError(404, "Order not found");

  try {
    await prisma.order.delete({ where: { id: orderId } });
    // also remove related activities & assignments
    await prisma.orderActivity.deleteMany({ where: { orderId } });
    await prisma.orderAssignment.deleteMany({ where: { orderId } });

    getIO()?.emit("order:deleted", { id: orderId });
    res.json({ ok: true, data: { id: orderId } });
  } catch (e: any) {
    console.error("hardDeleteOrder failed:", (e && e.message) || e, { orderId });
    throw e;
  }
});

export const bulkUploadCsv = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ApiError(400, "No CSV file uploaded");

  const merchantId = req.body?.merchantId;
  let merchant: any = undefined;
  try {
    merchant = merchantId ? await prisma.merchant.findUnique({ where: { id: merchantId } }) : await getOrCreateDefaultMerchant();
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

      const externalId = row.externalid || row.externalId || row.orderid || row.orderid?.toString();
      if (!externalId) {
        throw new Error("externalId (order number) is required in CSV for WhatsApp orders");
      }

      const exists = await prisma.order.findUnique({ where: { externalId: String(externalId) } });
      if (exists) {
        throw new Error(`Order number ${externalId} already exists`);
      }

      const created = await prisma.order.create({
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

      // activity
      await prisma.orderActivity.create({ data: { orderId: created.id, userId: req.user?.id ?? undefined, action: "Order Created (CSV)", notes: `Imported by ${req.user?.name || "system"}` } as any });

      imported++;
    } catch (e: any) {
      errors.push({ row: i + 2, error: e.message });
    }
  }

  if (imported > 0) getIO()?.emit("orders:bulk-imported", { merchantId: merchant?.id, count: imported });

  res.status(errors.length && imported === 0 ? 400 : 201).json({ ok: errors.length === 0, imported, count: imported, errors });
});

export const uploadPod = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ApiError(400, "No file uploaded");

  const podUrl = `/uploads/pod/${file.filename}`;
  try {
    const order = await prisma.order.update({ where: { id: req.params.id }, data: { podUrl } }).catch(() => {
      throw new ApiError(404, "Order not found");
    });

    res.json({ ok: true, data: order });
  } catch (e: any) {
    console.error("uploadPod failed:", (e && e.message) || e, { orderId: req.params.id, podUrl });
    throw e;
  }
});