import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { OrderStatus } from "../types/enums";
import { serializeOrder, MAX_ACTIVE_DELIVERIES, ACTIVE_ORDER_STATUSES } from "../utils/orderSerializer";
import { getIO } from "../socket";

/**
 * Get orders waiting for dispatch (NEW, unassigned, not deleted)
 */
export async function listDispatches(_req: Request, res: Response) {
  try {
    const dispatches = await prisma.order.findMany({
      where: {
        isDeleted: false,
        riderId: null,
        status: OrderStatus.NEW,
      },
      include: { rider: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      ok: true,
      data: dispatches.map(serializeOrder),
      items: dispatches.map(serializeOrder),
      dispatches: dispatches.map(serializeOrder),
    });
  } catch (error) {
    console.error("Dispatch list error:", error);
    return res.status(500).json({ ok: false, message: "Failed to load dispatch queue" });
  }
}

/**
 * Assign rider — same validation as POST /orders/:id/assign
 */
export async function assignDispatch(req: Request, res: Response) {
  try {
    const { orderId, riderId } = req.body;
    if (!orderId || !riderId) {
      return res.status(400).json({ ok: false, message: "orderId and riderId are required" });
    }

    const existing = await prisma.order.findFirst({
      where: { id: orderId, isDeleted: false },
    });
    if (!existing) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    const rider = await prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) {
      return res.status(404).json({ ok: false, message: "Rider not found" });
    }
    if (rider.status === "OFFLINE") {
      return res.status(400).json({ ok: false, message: "Cannot assign order: rider is offline." });
    }
    if (rider.status === "SUSPENDED") {
      return res.status(400).json({ ok: false, message: "Cannot assign order: rider is suspended." });
    }

    const activeCount = await prisma.order.count({
      where: {
        riderId: rider.id,
        isDeleted: false,
        status: { in: [...ACTIVE_ORDER_STATUSES] },
      },
    });
    if (activeCount >= MAX_ACTIVE_DELIVERIES) {
      return res.status(400).json({
        ok: false,
        message: "Rider has reached the maximum number of active deliveries.",
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { riderId, status: OrderStatus.ASSIGNED },
      include: { rider: true },
    });

    const serialized = serializeOrder(updatedOrder);
    getIO()?.emit("order.assigned", serialized);
    getIO()?.emit("order:assigned", serialized);

    return res.json({ ok: true, data: serialized });
  } catch (error) {
    console.error("Dispatch assignment error:", error);
    return res.status(500).json({ ok: false, message: "Assignment failed" });
  }
}
