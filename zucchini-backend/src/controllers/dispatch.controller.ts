import { Request, Response } from "express";
import prisma from "../utils/prisma";


/**
 * Get pending orders waiting for dispatch
 */
export async function listDispatches(
  req: Request,
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


    res.json(dispatches);

  } catch(error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to load dispatch queue"
    });

  }
}


/**
 * Assign rider to order
 */
export async function assignDispatch(
  req: Request,
  res: Response
) {

  try {

    const {
      orderId,
      riderId
    } = req.body;


    const updatedOrder =
      await prisma.order.update({

        where:{
          id: orderId
        },

        data:{
          riderId,
          status:"ASSIGNED"
        }

      });


    res.json(updatedOrder);


  } catch(error){

    console.error(error);

    res.status(500).json({
      message:"Assignment failed"
    });

  }

}