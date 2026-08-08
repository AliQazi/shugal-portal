import express from "express";
import {
  getAvailableMCTBookingsByGroup,
  checkMCTGroupSeats,
} from "../controllers/mct.controller.js";

const router = express.Router();

router.get("/available-bookings-by-group", getAvailableMCTBookingsByGroup);
router.get("/group/:groupId/seats", checkMCTGroupSeats);

export default router;
