import express from "express";
import {
  checkAbidAirFlightAvailability,
  getAvailableAbidAirBookingsByGroup,
} from "../controllers/abidair.controller.js";
import { applyUmrahPackageRules } from "../middleware/marginVisibility.middleware.js";

const router = express.Router();

router.get("/available-bookings-by-group", applyUmrahPackageRules, getAvailableAbidAirBookingsByGroup);
router.get(
  "/flight/:flightId/availability",
  checkAbidAirFlightAvailability,
);

export default router;
