import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  listRiders,
  createRider,
  updateRider,
  deleteRider,
  updateRiderLocation,
} from "../controllers/riders.controller";

const router = Router();

router.use(requireAuth);

router.get("/", listRiders);
router.post("/", requireRole("ADMIN", "DISPATCHER"), createRider);
router.patch("/:id", requireRole("ADMIN", "DISPATCHER"), updateRider);
router.delete("/:id", requireRole("ADMIN", "DISPATCHER"), deleteRider);
router.post("/:id/location", updateRiderLocation); // riders update their own location

export default router;
