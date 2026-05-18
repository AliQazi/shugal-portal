import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinary } from "../config/cloudinary.js";
import { protect } from "../middleware/auth.middleware.js";
import {
  createUmrahPackageBooking,
  getMyUmrahPackageBookings,
  getUmrahPackageBookingById,
  adminGetAllBookings,
  adminUpdateBookingStatus,
} from "../controllers/umrahPackageBooking.controller.js";

const router = express.Router();

// Dynamic multi-field passport upload (passportFile_0, passportFile_1, …)
const passportStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === "application/pdf";
    return {
      folder: "umrah-booking-passports",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],
      resource_type: isPdf ? "raw" : "image",
    };
  },
});

const uploadPassports = multer({
  storage: passportStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields(
  Array.from({ length: 20 }, (_, i) => ({ name: `passportFile_${i}`, maxCount: 1 }))
);

// ── User routes ──────────────────────────────────────────
router.post("/create", protect, uploadPassports, createUmrahPackageBooking);
router.get("/my", protect, getMyUmrahPackageBookings);

// ── Admin routes (must be before /:id to avoid param capture) ───────────────
router.get("/admin/all", protect, adminGetAllBookings);
router.patch("/admin/:id/status", protect, adminUpdateBookingStatus);

// ── Param route last ─────────────────────────────────────
router.get("/:id", protect, getUmrahPackageBookingById);

export default router;
