import express from "express";
import {
  checkAbidAirFlightAvailability,
  getAvailableAbidAirBookingsByGroup,
} from "../controllers/abidair.controller.js";

const router = express.Router();

router.get("/available-bookings-by-group", getAvailableAbidAirBookingsByGroup);
router.get(
  "/flight/:flightId/availability",
  checkAbidAirFlightAvailability,
);

export default router;
