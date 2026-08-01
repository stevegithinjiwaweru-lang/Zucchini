import { Request, Response } from "express";
import prisma from "../lib/prisma";


/**
 * Get pending orders waiting for dispatch
 */
export async function listDispatches(
  _req: Request,
  res: Response
) {
  try {
    const dispatches = await prisma.order.findMany({
      where: {
        riderId: null,
        status: "PENDING",
      },
      include: {
        merchant: true,
        customer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(dispatches);

  } catch (error) {
    console.error("Dispatch list error:", error);

    return res.status(500).json({
      message: "Failed to load dispatch queue",
    });
  }
}


/**
 * Assign rider to an order
 */
export async function assignDispatch(
  req: Request,
  res: Response
) {
  try {
    const {
      orderId,
      riderId,
    } = req.body;


    if (!orderId || !riderId) {
      return res.status(400).json({
        message: "orderId and riderId are required",
      });
    }


    const updatedOrder = await prisma.order.update({
      where: {
        id: orderId,
      },

      data: {
        riderId,
        status: "ASSIGNED",
      },
    });


    return res.json(updatedOrder);

  } catch (error) {
    console.error("Dispatch assignment error:", error);

    return res.status(500).json({
      message: "Assignment failed",
    });
  }
}