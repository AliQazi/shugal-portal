import express from "express";
import { upload } from "../config/cloudinary.js";
import {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  getLedgerByUser,
  exportLedgerCSV,
  exportLedgerExcel,
  exportLedgerPDF,
} from "../controllers/payment.controller.js";

const router = express.Router();

// Create new payment (with receipt upload)
router.post("/add", upload.single("receipt"), createPayment);

// Get all payments (with optional filters)
router.get("/", getPayments);

// Get single payment by ID
router.get("/:id", getPaymentById);

// Update payment (with optional receipt upload)
router.put("/:id", upload.single("receipt"), updatePayment);

// Delete payment
router.delete("/:id", deletePayment);

// Get ledger for a specific user
router.get("/ledger/:userId", getLedgerByUser);

// Export ledger in different formats
router.get("/ledger/:userId/export/csv", exportLedgerCSV);
router.get("/ledger/:userId/export/excel", exportLedgerExcel);
router.get("/ledger/:userId/export/pdf", exportLedgerPDF);

export default router;
