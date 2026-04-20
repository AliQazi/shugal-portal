import express from "express";
import { upload } from "../config/cloudinary.js";
import {
  addAirline,
  getAirlines,
  getAirlineById,
  updateAirline,
  deleteAirline
} from "../controllers/airline.controller.js";

const router = express.Router();

// Add new airline (with logo upload)
router.post("/add", upload.single("logo"), addAirline);

// Get all airlines
router.get("/", getAirlines);

// Get single airline by ID
router.get("/:id", getAirlineById);

// Update airline (with optional logo upload)
router.put("/:id", upload.single("logo"), updateAirline);

// Delete airline
router.delete("/:id", deleteAirline);

export default router;
