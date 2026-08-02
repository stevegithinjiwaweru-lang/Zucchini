import { Response } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import { createOrderSchema } from "../utils/schemas";

// one of our real statuses (NEW/ASSIGNED/.../RETURNED). We treat PENDING as an
// alias for NEW so unassigned orders still show up — see README for the
// one-line frontend fix to send NEW directly insteadal.
function normalizeStatusFilter(status?: string) {
  if (!status) return undefined;
  if (status === "PENDING") return "NEW";
  return status;
}

export const listOrders = asyncHandler(async (req: any, res: Response) => {
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
    include: { rider: true }, // removed merchant include to decouple from Merchant model
  });

  res.json({ ok: true, data: orders, items: orders, total: orders.length });
});

export const getMyOrders = asyncHandler(async (req: any, res: Response) => {
  if (!req.user?.riderId) throw new ApiError(400, "This account is not linked to a rider");
  const orders = await prisma.order.findMany({
    where: { riderId: req.user.riderId, status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } },
    orderBy: { createdAt: "desc" },
    include: { rider: true },
  });
  res.json({ ok: true, data: orders });
});

export const getOrder = asyncHandler(async (req: any, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { rider: true }, // removed merchant include to decouple
  });
  if (!order) throw new ApiError(404, "Order not found");
  res.json({ ok: true, data: order });
});

// Manual order creation from the Dispatch page — pickup/destination coordinates
// come from the frontend's map-based LocationPicker.
export const createOrder = asyncHandler(async (req: any, res: Response) => {
  const body = createOrderSchema.parse(req.body);

  // NOTE: merchantId is now optional. We do NOT create a default Merchant anymore.
  // This allows the system to continue operating without the Merchant table; when
  // the DB migration is applied merchantId will be allowed to be null.
  const merchantId = body.merchantId ?? undefined;

  const orderData: any = {
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
  };

  if (merchantId) orderData.merchantId = merchantId;

  const order = await prisma.order.create({
    data: orderData,
    include: { rider: true },
  });

  res.status(201).json({ ok: true, data: order });
});
