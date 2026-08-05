import { Response } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import { createRiderSchema, updateRiderSchema, riderLocationSchema } from "../utils/schemas";
import { hashPassword } from "../utils/password";
import { AuthedRequest } from "../middleware/auth";
import { getIO } from "../socket";

function serializeRider(rider: any) {
  return {
    id: rider.id,
    name: rider.name,
    phone: rider.phone,
    nationalId: rider.nationalId ?? undefined,
    drivingLicenceNo: rider.drivingLicenceNo ?? undefined,
    bikeReg: rider.bikeReg ?? undefined,
    vehicleType: rider.vehicleType ?? undefined,
    branch: rider.branch ?? undefined,
    status: rider.status,
    activeOrders: rider._count?.orders ?? undefined,
    lastActiveAt: rider.lastActiveAt ?? null,
    lastLocation:
      rider.lastLat != null && rider.lastLng != null
        ? { lat: rider.lastLat, lng: rider.lastLng, timestamp: rider.lastLocationAt }
        : undefined,
    userId: rider.user?.id,
  };
}

export const listRiders = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit || "200"), 10) || 200, 500);
  const riders = await prisma.rider.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { user: true, _count: { select: { orders: { where: { status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } } } } } },
  });
  res.json({ ok: true, data: riders.map(serializeRider), items: riders.map(serializeRider) });
});

export const createRider = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = createRiderSchema.parse(req.body);

  // Validate password/confirm and uniqueness
  if (body.password !== body.confirmPassword) {
    throw new ApiError(400, "Password and confirm password do not match");
  }

  const existingUser = await prisma.user.findUnique({ where: { phone: body.phone } });
  if (existingUser) throw new ApiError(409, "A user with that phone number already exists");
  const existingRider = await prisma.rider.findUnique({ where: { phone: body.phone } });
  if (existingRider) throw new ApiError(409, "A rider with that phone number already exists");

  const passwordHash = await hashPassword(body.password);

  // Create rider and linked user in a transaction
  const rider = await prisma.$transaction(async (tx) => {
    const r = await tx.rider.create({
      data: {
        name: body.name,
        phone: body.phone,
        nationalId: body.nationalId,
        drivingLicenceNo: body.drivingLicenceNo,
        bikeReg: body.bikeReg,
        vehicleType: body.vehicleType,
        branch: body.branch,
        status: "OFFLINE",
      },
    });

    await tx.user.create({
      data: { name: body.name, phone: body.phone, passwordHash, role: "RIDER", riderId: r.id },
    });

    return r;
  });

  res.status(201).json({ ok: true, data: serializeRider(rider), rider: serializeRider(rider) });
});

export const updateRider = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const body = updateRiderSchema.parse(req.body) as any;
  const password = body.password;
  const rest = Object.fromEntries(Object.entries(body).filter(([k]) => k !== "password"));

  const rider = await prisma.rider.update({ where: { id }, data: rest }).catch(() => {
    throw new ApiError(404, "Rider not found");
  });

  if (password) {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.findUnique({ where: { phone: rider.phone } });
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    } else {
      await prisma.user.create({ data: { name: rider.name, phone: rider.phone, passwordHash, role: "RIDER", riderId: rider.id } });
    }
  }

  res.json({ ok: true, data: serializeRider(rider), rider: serializeRider(rider) });
});

export const deleteRider = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const activeOrders = await prisma.order.count({
    where: { riderId: id, status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } },
  });
  if (activeOrders > 0) {
    throw new ApiError(409, "Cannot delete a rider with active orders");
  }
  await prisma.rider.delete({ where: { id } }).catch(() => {
    throw new ApiError(404, "Rider not found");
  });
  res.json({ ok: true });
});

export const updateRiderLocation = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const { lat, lng } = riderLocationSchema.parse(req.body);

  const rider = await prisma.rider.update({
    where: { id },
    data: { lastLat: lat, lastLng: lng, lastLocationAt: new Date(), lastActiveAt: new Date() },
  }).catch(() => {
    throw new ApiError(404, "Rider not found");
  });

  getIO()?.emit("rider:location", { riderId: id, lat, lng, timestamp: new Date().toISOString() });

  res.json({ ok: true, data: serializeRider(rider) });
});
