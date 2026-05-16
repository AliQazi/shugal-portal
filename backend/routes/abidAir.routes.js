import express from "express";
import { getAvailableAbidAirBookingsByGroup } from "../controllers/abidair.controller.js";

const router = express.Router();

router.get("/available-bookings-by-group", getAvailableAbidAirBookingsByGroup);

export default router;
