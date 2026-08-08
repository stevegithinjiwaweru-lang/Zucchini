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
import { OrderStatus } from "../types/enums";
import {
  serializeOrder,
  isOrderNumberLocked,
  MAX_ACTIVE_DELIVERIES,
  ACTIVE_ORDER_STATUSES,
} from "../utils/orderSerializer";
import { writeAudit } from "../services/audit.service";
import { parseCsv } from "../utils/csv";

function normalizeStatusFilter(status?: string) {
  if (!status) return undefined as OrderStatus | undefined;
  if (status === "PENDING") return OrderStatus.NEW;
  return status as OrderStatus;
}

/** Soft-delete filter: hide deleted unless includeDeleted=true */
function baseWhere(req: AuthedRequest) {
  const includeDeleted = String(req.query.includeDeleted || "") === "true";
  if (includeDeleted && (req.user?.role === "ADMIN" || req.user?.role === "DISPATCHER")) {
    return {} as any;
  }
  return { isDeleted: false } as any;
}

function emitDashboard() {
  getIO()?.emit("dashboard.updated", { at: new Date().toISOString() });
  getIO()?.emit("dashboard:updated", { at: new Date().toISOString() });
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
    console.warn("Merchant lookup/creation failed:", (e as any)?.message || e);
    return undefined as any;
  }
}

export const listOrders = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { status, riderId, merchantId, source, search, orderNo, dateFrom, dateTo, onlyDeleted } =
    req.query as Record<string, string>;
  const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
  const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);

  const where: any = { ...baseWhere(req) };
  if (onlyDeleted === "true") {
    where.isDeleted = true;
  }

  // Dispatch page: NEW + unassigned + inbound sources only
  if (String(req.query.dispatchQueue || "") === "true") {
    where.status = OrderStatus.NEW;
    where.riderId = null;
    where.source = { in: ["MANUAL", "SHOPIFY", "WHATSAPP"] };
  }

  const normalizedStatus = normalizeStatusFilter(status);
  if (normalizedStatus) where.status = normalizedStatus;
  if (riderId) where.riderId = riderId;
  if (merchantId) where.merchantId = merchantId;
  if (source) where.source = source;

  const q = (search || orderNo || "").trim();
  if (q) {
    where.OR = [
      { externalId: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
      { destination: { contains: q, mode: "insensitive" } },
      { rider: { name: { contains: q, mode: "insensitive" } } },
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
      include: { rider: true },
    }),
    prisma.order.count({ where }),
  ]);

  const mapped = orders.map(serializeOrder);
  res.json({ ok: true, data: mapped, items: mapped, total, page, limit });
});

export const getMyOrders = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.user?.riderId) throw new ApiError(400, "This account is not linked to a rider");

  // scope: active (default) | completed | all
  const scope = String(req.query.scope || "all").toLowerCase();
  const ACTIVE = [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT];
  const COMPLETED = [OrderStatus.DELIVERED, OrderStatus.FAILED, OrderStatus.RETURNED];

  let statuses: OrderStatus[];
  if (scope === "active") statuses = ACTIVE;
  else if (scope === "completed") statuses = COMPLETED;
  else statuses = [...ACTIVE, ...COMPLETED];

  const limit = Math.min(parseInt(String(req.query.limit || "100"), 10) || 100, 200);

  const orders = await prisma.order.findMany({
    where: {
      isDeleted: false,
      riderId: req.user.riderId,
      status: { in: statuses },
    },
    orderBy: [{ deliveredAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: { rider: true },
  });

  const data = orders.map(serializeOrder);
  res.json({
    ok: true,
    data,
    items: data,
    active: data.filter((o: any) => ACTIVE.includes(o.status)),
    completed: data.filter((o: any) => COMPLETED.includes(o.status)),
  });
});

export const getOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, ...baseWhere(req) },
    include: { rider: true },
  });
  if (!order) throw new ApiError(404, "Order not found");
  res.json({ ok: true, data: serializeOrder(order) });
});

export const updateOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const body = updateOrderSchema.parse(req.body) as any;

  if (!body.externalId && body.orderNumber) body.externalId = body.orderNumber;

  const existing = await prisma.order.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new ApiError(404, "Order not found");

  // Lock order number once assigned / past NEW
  if (body.externalId && body.externalId !== existing.externalId) {
    if (isOrderNumberLocked(existing.status, !!existing.riderId)) {
      throw new ApiError(
        400,
        "Order number cannot be changed after the order has been assigned or progressed past NEW"
      );
    }
    const dup = await prisma.order.findUnique({ where: { externalId: body.externalId } });
    if (dup && dup.id !== id) throw new ApiError(409, "Order number already exists.");
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
  };

  // Only allow externalId change when not locked
  if (body.externalId && !isOrderNumberLocked(existing.status, !!existing.riderId)) {
    data.externalId = body.externalId;
    data.needsOrderNumberReview = false;
  }

  const toUpdate = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));

  const order = await prisma.order.update({
    where: { id },
    data: toUpdate,
    include: { rider: true },
  });

  const serialized = serializeOrder(order);
  await writeAudit({
    action: "ORDER_EDITED",
    entityType: "Order",
    entityId: id,
    previousValues: serializeOrder(existing),
    newValues: serialized,
    req,
  });

  getIO()?.emit("order.updated", serialized);
  getIO()?.emit("order:updated", serialized);
  emitDashboard();
  res.json({ ok: true, data: serialized });
});

export const createOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = createOrderSchema.parse(req.body);

  if (!body.externalId && (body as any).orderNumber) {
    (body as any).externalId = (body as any).orderNumber;
  }

  if (!body.externalId) {
    throw new ApiError(400, "Order number is required for manual orders");
  }

  const already = await prisma.order.findUnique({ where: { externalId: body.externalId } });
  if (already) {
    throw new ApiError(409, "Order number already exists.");
  }

  let merchant: any = undefined;
  try {
    merchant = body.merchantId
      ? await prisma.merchant.findUnique({ where: { id: body.merchantId } })
      : await getOrCreateDefaultMerchant();
  } catch (e) {
    console.warn("Merchant lookup failed:", (e as any)?.message || e);
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
    status: OrderStatus.NEW,
    source: "MANUAL",
    externalId: body.externalId,
    isDeleted: false,
  };

  if (merchant?.id) orderData.merchantId = merchant.id;

  try {
    const order = await prisma.order.create({ data: orderData, include: { rider: true } });
    const serialized = serializeOrder(order);

    await writeAudit({
      action: "ORDER_CREATED",
      entityType: "Order",
      entityId: order.id,
      newValues: serialized,
      req,
    });

    getIO()?.emit("order.created", serialized);
    getIO()?.emit("order:created", serialized);
    emitDashboard();
    res.status(201).json({ ok: true, data: serialized, order: serialized });
  } catch (e: any) {
    if (e?.code === "P2002" && e?.meta?.target?.includes("externalId")) {
      throw new ApiError(409, "Order number already exists.");
    }
    console.error("createOrder failed:", e?.message || e);
    throw e;
  }
});

/** Soft delete — keeps the row, hides from normal queries */
export const deleteOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.order.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new ApiError(404, "Order not found");

  const order = await prisma.order.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user?.id || null,
    },
    include: { rider: true },
  });

  const serialized = serializeOrder(order);
  await writeAudit({
    action: "ORDER_DELETED",
    entityType: "Order",
    entityId: id,
    previousValues: serializeOrder(existing),
    newValues: serialized,
    req,
  });

  getIO()?.emit("order.deleted", serialized);
  getIO()?.emit("order:deleted", serialized);
  emitDashboard();
  res.json({ ok: true, data: serialized });
});

/** Restore soft-deleted order (admin / dispatcher) */
export const restoreOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.order.findFirst({ where: { id, isDeleted: true } });
  if (!existing) throw new ApiError(404, "Deleted order not found");

  const order = await prisma.order.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null, deletedBy: null },
    include: { rider: true },
  });

  const serialized = serializeOrder(order);
  await writeAudit({
    action: "ORDER_RESTORED",
    entityType: "Order",
    entityId: id,
    previousValues: serializeOrder(existing),
    newValues: serialized,
    req,
  });

  getIO()?.emit("order.restored", serialized);
  getIO()?.emit("order:restored", serialized);
  emitDashboard();
  res.json({ ok: true, data: serialized });
});

export const assignOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const body = assignOrderSchema.parse(req.body) as any;

  const existing = await prisma.order.findFirst({
    where: { id, isDeleted: false },
    include: { rider: true },
  });
  if (!existing) throw new ApiError(404, "Order not found");

  const rider = await prisma.rider.findUnique({ where: { id: body.riderId } });
  if (!rider) throw new ApiError(404, "Rider not found");

  if (rider.status === "OFFLINE") {
    throw new ApiError(400, "Cannot assign order: rider is offline.");
  }
  if (rider.status === "SUSPENDED") {
    throw new ApiError(400, "Cannot assign order: rider is suspended.");
  }

  const activeCount = await prisma.order.count({
    where: {
      riderId: rider.id,
      isDeleted: false,
      status: { in: [...ACTIVE_ORDER_STATUSES] },
    },
  });
  if (activeCount >= MAX_ACTIVE_DELIVERIES) {
    throw new ApiError(
      400,
      "Rider has reached the maximum number of active deliveries."
    );
  }

  const wasReassign = !!existing.riderId && existing.riderId !== body.riderId;

  const order = await prisma.order.update({
    where: { id },
    data: { riderId: body.riderId, status: OrderStatus.ASSIGNED },
    include: { rider: true },
  });

  // Mark rider busy when they have active work
  if (rider.status === "AVAILABLE") {
    await prisma.rider.update({
      where: { id: rider.id },
      data: { status: "BUSY" },
    }).catch(() => {});
  }

  const serialized = serializeOrder(order);
  await writeAudit({
    action: wasReassign ? "ORDER_REASSIGNED" : "ORDER_ASSIGNED",
    entityType: "Order",
    entityId: id,
    previousValues: serializeOrder(existing),
    newValues: serialized,
    req,
  });

  if (wasReassign) {
    getIO()?.emit("order.reassigned", serialized);
    getIO()?.emit("order:reassigned", serialized);
  }
  getIO()?.emit("order.assigned", serialized);
  getIO()?.emit("order:assigned", serialized);
  emitDashboard();
  res.json({ ok: true, data: serialized });
});

export const unassignOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.order.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new ApiError(404, "Order not found");

  const order = await prisma.order.update({
    where: { id },
    data: { riderId: null, status: OrderStatus.NEW },
    include: { rider: true },
  });
  const serialized = serializeOrder(order);
  getIO()?.emit("order.updated", serialized);
  getIO()?.emit("order:unassigned", serialized);
  emitDashboard();
  res.json({ ok: true, data: serialized });
});

export const updateOrderStatus = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const body = updateOrderStatusSchema.parse(req.body) as any;

  const existing = await prisma.order.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new ApiError(404, "Order not found");

  const data: any = { status: body.status as OrderStatus };
  if (body.status === "DELIVERED") data.deliveredAt = new Date();

  const order = await prisma.order.update({
    where: { id },
    data,
    include: { rider: true },
  });

  const serialized = serializeOrder(order);
  const action =
    body.status === "DELIVERED"
      ? "ORDER_DELIVERED"
      : body.status === "FAILED" || body.status === "RETURNED"
        ? "ORDER_CANCELLED"
        : "ORDER_STATUS_CHANGED";

  await writeAudit({
    action,
    entityType: "Order",
    entityId: id,
    previousValues: { status: existing.status },
    newValues: { status: order.status },
    req,
  });

  getIO()?.emit("order.updated", serialized);
  getIO()?.emit("order:status:update", serialized);
  if (body.status === "DELIVERED") {
    getIO()?.emit("order.completed", serialized);
    getIO()?.emit("order:completed", serialized);
  }
  emitDashboard();
  res.json({ ok: true, data: serialized });
});

export const createWhatsappOrder = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = whatsappOrderSchema.parse(req.body) as any;
  if (!body.externalId && body.orderNumber) body.externalId = body.orderNumber;
  if (!body.externalId) {
    throw new ApiError(400, "Order number is required for WhatsApp orders");
  }
  const already = await prisma.order.findUnique({ where: { externalId: body.externalId } });
  if (already) throw new ApiError(409, "Order number already exists.");

  // Preserve WhatsApp metadata inside notes (no dedicated columns yet)
  const metaParts: string[] = [];
  if (body.waSenderPhone) metaParts.push(`WA sender: ${body.waSenderPhone}`);
  if (body.waMessageExcerpt) metaParts.push(`WA message: ${body.waMessageExcerpt}`);
  const notesCombined = [body.notes, ...metaParts].filter(Boolean).join("\n") || null;

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
    notes: notesCombined,
    status: OrderStatus.NEW,
    source: "WHATSAPP",
    externalId: body.externalId,
    isDeleted: false,
  };

  try {
    const order = await prisma.order.create({ data: orderData, include: { rider: true } });
    const serialized = serializeOrder(order);
    await writeAudit({
      action: "ORDER_CREATED",
      entityType: "Order",
      entityId: order.id,
      newValues: { ...serialized, waSenderPhone: body.waSenderPhone, waMessageExcerpt: body.waMessageExcerpt },
      req,
    });
    getIO()?.emit("order.created", serialized);
    getIO()?.emit("order:created", serialized);
    emitDashboard();
    res.status(201).json({ ok: true, data: serialized });
  } catch (e: any) {
    if (e?.code === "P2002" && e?.meta?.target?.includes("externalId")) {
      throw new ApiError(409, "Order number already exists.");
    }
    throw e;
  }
});

export const bulkUploadCsv = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.file) throw new ApiError(400, "file is required");

  const text = req.file.buffer
    ? req.file.buffer.toString("utf8")
    : require("fs").readFileSync(req.file.path, "utf8");

  const rows = parseCsv(text);
  if (!rows.length) throw new ApiError(400, "CSV has no data rows");

  // Accept column aliases for order number
  const orderNumKey = (row: Record<string, string>) => {
    const keys = Object.keys(row);
    const found = keys.find((k) =>
      ["externalid", "external_id", "ordernumber", "order_number", "order no", "orderno", "order no."].includes(
        k.toLowerCase().trim()
      )
    );
    return found ? row[found].trim() : "";
  };

  const results: { row: number; orderNumber?: string; ok: boolean; error?: string; id?: string }[] = [];
  let imported = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const orderNumber = orderNumKey(row);
    if (!orderNumber) {
      results.push({ row: i + 2, ok: false, error: "Order number (externalId) is required" });
      continue;
    }

    const customerName =
      row.customername || row.customer_name || row.customer || row.name || "";
    const phone = row.phone || row.customerphone || row.customer_phone || row.mobile || "";
    const address = row.address || row.pickup || row.pickuplocation || row.pickup_location || "";
    const destination = row.destination || row.dropoff || row.drop || "";
    const amount = parseFloat(row.amount || row.value || "0") || 0;
    const notes = row.notes || row.note || "";

    if (!customerName || !phone || !address) {
      results.push({
        row: i + 2,
        orderNumber,
        ok: false,
        error: "customerName, phone, and address/pickup are required",
      });
      continue;
    }

    try {
      const existing = await prisma.order.findUnique({ where: { externalId: orderNumber } });
      if (existing) {
        results.push({ row: i + 2, orderNumber, ok: false, error: "Order number already exists." });
        continue;
      }

      const order = await prisma.order.create({
        data: {
          customerName,
          phone,
          address,
          destination: destination || null,
          amount,
          notes: notes || null,
          status: OrderStatus.NEW,
          source: "CSV",
          externalId: orderNumber,
          isDeleted: false,
          paymentType: (row.paymenttype || row.payment || "COD").toUpperCase() === "PREPAID" ? "PREPAID" : "COD",
        },
      });

      imported += 1;
      results.push({ row: i + 2, orderNumber, ok: true, id: order.id });

      const serialized = serializeOrder(order);
      getIO()?.emit("order.created", serialized);
      getIO()?.emit("order:created", serialized);
    } catch (e: any) {
      results.push({
        row: i + 2,
        orderNumber,
        ok: false,
        error: e?.message || "Failed to create order",
      });
    }
  }

  await writeAudit({
    action: "ORDER_CREATED",
    entityType: "Order",
    entityId: null,
    newValues: { imported, total: rows.length, source: "CSV" },
    req,
  });

  emitDashboard();
  res.status(200).json({
    ok: true,
    imported,
    total: rows.length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
});

export const uploadPod = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.file) throw new ApiError(400, "file is required");
  res.status(501).json({ ok: false, error: "uploadPod not implemented yet" });
});

/** Live dashboard statistics */
export const dashboardStats = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

  const [
    pendingOrders,
    assignedOrders,
    inTransit,
    deliveredToday,
    cancelledToday,
    availableRiders,
    busyRiders,
    offlineRiders,
    suspendedRiders,
    waitingOver30,
    todaysDeliveries,
    deliveredWithTimes,
  ] = await Promise.all([
    prisma.order.count({ where: { isDeleted: false, status: "NEW" } }),
    prisma.order.count({ where: { isDeleted: false, status: "ASSIGNED" } }),
    prisma.order.count({ where: { isDeleted: false, status: { in: ["PICKED_UP", "IN_TRANSIT"] } } }),
    prisma.order.count({
      where: { isDeleted: false, status: "DELIVERED", deliveredAt: { gte: startOfDay } },
    }),
    prisma.order.count({
      where: {
        isDeleted: false,
        status: { in: ["FAILED", "RETURNED"] },
        updatedAt: { gte: startOfDay },
      },
    }),
    prisma.rider.count({ where: { status: "AVAILABLE" } }),
    prisma.rider.count({ where: { status: { in: ["BUSY", "IN_DELIVERY"] } } }),
    prisma.rider.count({ where: { status: "OFFLINE" } }),
    prisma.rider.count({ where: { status: "SUSPENDED" } }),
    prisma.order.count({
      where: {
        isDeleted: false,
        status: "NEW",
        createdAt: { lte: thirtyMinAgo },
      },
    }),
    prisma.order.count({
      where: { isDeleted: false, status: "DELIVERED", deliveredAt: { gte: startOfDay } },
    }),
    prisma.order.findMany({
      where: {
        isDeleted: false,
        status: "DELIVERED",
        deliveredAt: { not: null },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { createdAt: true, deliveredAt: true },
      take: 500,
    }),
  ]);

  let avgDeliveryMinutes: number | null = null;
  if (deliveredWithTimes.length) {
    const mins = deliveredWithTimes
      .filter((o: { deliveredAt: Date | null }) => !!o.deliveredAt)
      .map((o: { deliveredAt: Date | null; createdAt: Date }) =>
        (o.deliveredAt!.getTime() - o.createdAt.getTime()) / 60000
      );
    if (mins.length) {
      avgDeliveryMinutes = Math.round(mins.reduce((a: number, b: number) => a + b, 0) / mins.length);
    }
  }

  res.json({
    ok: true,
    data: {
      pendingOrders,
      assignedOrders,
      inTransit,
      deliveredToday,
      cancelledToday,
      availableRiders,
      busyRiders,
      offlineRiders,
      suspendedRiders,
      averageDeliveryTimeMinutes: avgDeliveryMinutes,
      ordersWaitingOver30Minutes: waitingOver30,
      todaysTotalDeliveries: todaysDeliveries,
    },
  });
});
