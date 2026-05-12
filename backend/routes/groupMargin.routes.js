import express from "express";
import {
  setGroupMargin,
  getGroupMargins,
  clearGroupMargin,
  getMarginLedger,
  backfillConfirmedBookingLedgers,
} from "../controllers/groupMargin.controller.js";

const router = express.Router();

// Set / update a per-group margin override (also writes a ledger entry)
router.post("/set", setGroupMargin);

// Get all active overrides as a key → value map
router.get("/all", getGroupMargins);

// Clear a per-group override
router.delete("/:source/:groupId", clearGroupMargin);

// Get the full margin ledger (admin audit trail)
router.get("/ledger", getMarginLedger);

// Backfill missing booking_confirmed ledger rows for already-confirmed bookings
router.post("/ledger/backfill-confirmed", backfillConfirmedBookingLedgers);

export default router;
