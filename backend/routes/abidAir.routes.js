import express from "express";
import {
  checkAbidAirFlightAvailability,
  checkAbidAirPackageAvailability,
  getAvailableAbidAirBookingsByGroup,
} from "../controllers/abidair.controller.js";
import { applyUmrahPackageRules } from "../middleware/marginVisibility.middleware.js";

const router = express.Router();

router.get("/available-bookings-by-group", applyUmrahPackageRules, getAvailableAbidAirBookingsByGroup);
router.get(
  "/flight/:flightId/availability",
  checkAbidAirFlightAvailability,
);
router.get(
  "/package/:packageId/availability",
  checkAbidAirPackageAvailability,
);

export default router;
