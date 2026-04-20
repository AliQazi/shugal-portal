import express from "express";
import {
  createBooking,
  getAllBookings,
  getBookingById,
  getBookingByReference,
  updateBookingStatus,
  updateBooking,
  cancelBooking,
  deleteBooking,
  getBookingStatistics,
  bulkTogglePriceOnCall,
  uploadPassengerDocument,
} from "../controllers/booking.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { uploadPassengerDoc } from "../config/cloudinary.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create a new booking
router.post("/", createBooking);

// Upload a passenger document (image or PDF)
router.post(
  "/upload-document",
  uploadPassengerDoc.single("document"),
  uploadPassengerDocument,
);

// Get all bookings (with filters)
router.get("/", getAllBookings);

// Get booking statistics (admin only)
router.get("/statistics", getBookingStatistics);

// Get booking by reference number
router.get("/reference/:reference", getBookingByReference);

// Get booking by ID
router.get("/:id", getBookingById);

// Update booking status (admin only)
router.patch("/:id/status", updateBookingStatus);

// Update booking details
router.put("/:id", updateBooking);

// Cancel booking
router.patch("/:id/cancel", cancelBooking);

// Delete booking (admin only)
router.delete("/:id", deleteBooking);

// Bulk toggle (admin only)
router.patch("/bulkTogglePriceOnCall", bulkTogglePriceOnCall);

export default router;
