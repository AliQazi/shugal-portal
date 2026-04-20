import express from "express";
import {
  createGroupTicketing,
  getAllGroupTicketings,
  getGroupTicketingById,
  updateGroupTicketing,
  deleteGroupTicketing,
  getPublicGroupTicketings
} from "../controllers/groupTicketing.controller.js";

const router = express.Router();

/* ===========================
   GROUP TICKETING ROUTES
=========================== */

router.post("/", createGroupTicketing);

router.get("/", getAllGroupTicketings);

// Public endpoint — no auth required, only returns groups with internalStatus "Public"
router.get("/public", getPublicGroupTicketings);

router.get("/:id", getGroupTicketingById);

router.put("/:id", updateGroupTicketing);

router.delete("/:id", deleteGroupTicketing);

export default router;
