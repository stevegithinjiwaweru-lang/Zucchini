import { Response } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import { createRiderSchema, updateRiderSchema, riderLocationSchema } from "../utils/schemas";
import { hashPassword } from "../utils/password";
import { AuthedRequest } from "../middleware/auth";
import { getIO } from "../socket";
import { writeAudit } from "../services/audit.service";

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
    include: {
      user: true,
      _count: {
        select: {
          orders: {
            where: {
              isDeleted: false,
              status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] },
            },
          },
        },
      },
    },
  });
  res.json({ ok: true, data: riders.map(serializeRider), items: riders.map(serializeRider) });
});

export const createRider = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = createRiderSchema.parse(req.body);

  if (body.password !== body.confirmPassword) {
    throw new ApiError(400, "Password and confirm password do not match");
  }

  const existingUser = await prisma.user.findUnique({ where: { phone: body.phone } });
  if (existingUser) throw new ApiError(409, "Phone number already belongs to another rider.");

  const existingRider = await prisma.rider.findUnique({ where: { phone: body.phone } });
  if (existingRider) throw new ApiError(409, "Phone number already belongs to another rider.");

  if (body.nationalId) {
    const dup = await prisma.rider.findFirst({ where: { nationalId: body.nationalId } });
    if (dup) throw new ApiError(409, "National ID already belongs to another rider.");
  }
  if (body.drivingLicenceNo) {
    const dup = await prisma.rider.findFirst({ where: { drivingLicenceNo: body.drivingLicenceNo } });
    if (dup) throw new ApiError(409, "Driving licence already belongs to another rider.");
  }

const passwordHash = await hashPassword(body.password);

  const rider = await prisma.$transaction(async (tx: any) => {
    const r = await tx.rider.create({
      data: {
      
        name: body.name,
        phone: body.phone,
        nationalId: body.nationalId || null,
        drivingLicenceNo: body.drivingLicenceNo || null,
        bikeReg: body.bikeReg,
        vehicleType: body.vehicleType,
        branch: body.branch,
        status: "AVAILABLE",
      },
    });

    await tx.user.create({
      data: {
        name: body.name,
        phone: body.phone,
        passwordHash,
        role: "RIDER",
        riderId: r.id,
      },
    });

    return r;
  });

  const serialized = serializeRider(rider);
  await writeAudit({
    action: "RIDER_CREATED",
    entityType: "Rider",
    entityId: rider.id,
    newValues: serialized,
    req,
  });

  getIO()?.emit("rider.created", serialized);
  getIO()?.emit("rider:created", serialized);
  getIO()?.emit("dashboard.updated", { at: new Date().toISOString() });

  res.status(201).json({ ok: true, data: serialized, rider: serialized });
});

export const updateRider = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const body = updateRiderSchema.parse(req.body) as any;
  const password = body.password;
  const rest = Object.fromEntries(
    Object.entries(body).filter(([k]) => k !== "password" && k !== "confirmPassword")
  );

  if (rest.nationalId) {
    const dup = await prisma.rider.findFirst({
      where: { nationalId: rest.nationalId as string, NOT: { id } },
    });
    if (dup) throw new ApiError(409, "National ID already belongs to another rider.");
  }
  if (rest.drivingLicenceNo) {
    const dup = await prisma.rider.findFirst({
      where: { drivingLicenceNo: rest.drivingLicenceNo as string, NOT: { id } },
    });
    if (dup) throw new ApiError(409, "Driving licence already belongs to another rider.");
  }
  if (rest.phone) {
    const dup = await prisma.rider.findFirst({
      where: { phone: rest.phone as string, NOT: { id } },
    });
    if (dup) throw new ApiError(409, "Phone number already belongs to another rider.");
  }

  const previous = await prisma.rider.findUnique({ where: { id } });
  if (!previous) throw new ApiError(404, "Rider not found");

  const rider = await prisma.rider.update({ where: { id }, data: rest }).catch(() => {
    throw new ApiError(404, "Rider not found");
  });

  if (password) {
    if (String(password).length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.findUnique({ where: { phone: rider.phone } });
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    } else {
      await prisma.user.create({
        data: {
          name: rider.name,
          phone: rider.phone,
          passwordHash,
          role: "RIDER",
          riderId: rider.id,
        },
      });
    }
  }

  const serialized = serializeRider(rider);
  await writeAudit({
    action: "RIDER_UPDATED",
    entityType: "Rider",
    entityId: id,
    previousValues: serializeRider(previous),
    newValues: serialized,
    req,
  });

  getIO()?.emit("rider.updated", serialized);
  getIO()?.emit("rider:updated", serialized);
  getIO()?.emit("dashboard.updated", { at: new Date().toISOString() });

  res.json({ ok: true, data: serialized, rider: serialized });
});

export const deleteRider = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const activeOrders = await prisma.order.count({
    where: {
      riderId: id,
      isDeleted: false,
      status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] },
    },
  });
  if (activeOrders > 0) {
    throw new ApiError(409, "Cannot delete a rider with active orders");
  }

  const previous = await prisma.rider.findUnique({ where: { id } });
  if (!previous) throw new ApiError(404, "Rider not found");

  await prisma.$transaction(async (tx: any) => {
    await tx.user.deleteMany({ where: { riderId: id } });
    await tx.rider.delete({ where: { id } });
  }).catch((e: any) => {
    if (e?.code === "P2025") throw new ApiError(404, "Rider not found");
    throw e;
  });

  await writeAudit({
    action: "RIDER_DELETED",
    entityType: "Rider",
    entityId: id,
    previousValues: serializeRider(previous),
    req,
  });

  getIO()?.emit("rider.deleted", { id });
  getIO()?.emit("rider:deleted", { id });
  getIO()?.emit("dashboard.updated", { at: new Date().toISOString() });

  res.json({ ok: true });
});

export const updateRiderLocation = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const { lat, lng } = riderLocationSchema.parse(req.body);

  const rider = await prisma.rider
    .update({
      where: { id },
      data: {
        lastLat: lat,
        lastLng: lng,
        lastLocationAt: new Date(),
        lastActiveAt: new Date(),
      },
    })
    .catch(() => {
      throw new ApiError(404, "Rider not found");
    });

  getIO()?.emit("rider:location", {
    riderId: id,
    lat,
    lng,
    timestamp: new Date().toISOString(),
  });

  res.json({ ok: true, data: serializeRider(rider) });
});
