import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { getHotels, createHotel, updateHotel, deleteHotel } from "../controllers/hotel.controller.js";

const router = express.Router();

router.get("/", getHotels);
router.post("/", protect, createHotel);
router.put("/", protect, updateHotel);
router.delete("/", protect, deleteHotel);

export default router;
