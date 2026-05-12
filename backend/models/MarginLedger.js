import mongoose from "mongoose";

/**
 * Audit trail for every margin event:
 *  - "margin_applied"    : admin set a per-group margin in ApiGroups
 *  - "booking_confirmed" : a booking was confirmed and margin profit was locked in
 */
const marginLedgerSchema = new mongoose.Schema(
  {
    entryType: {
      type: String,
      enum: ["margin_applied", "booking_confirmed"],
      required: true,
    },

    // Group / flight identification
    groupId: { type: String, required: true },
    source: { type: String, default: "" },
    sector: { type: String, default: "" },
    flightNo: { type: String, default: "" },
    deptDate: { type: Date, default: null },

    // Pricing snapshot
    basePrice: { type: Number, default: 0 },      // per pax base price
    marginAmount: { type: Number, required: true }, // per pax margin amount

    // Booking-confirmation extras (null when entryType === "margin_applied")
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      default: null,
    },
    bookingReference: { type: String, default: "" },
    passengers: { type: Number, default: 0 },
    totalMarginEarned: { type: Number, default: 0 }, // marginAmount × passengers
    totalFare: { type: Number, default: 0 }, // final booking fare (after margin/discount)

    note: { type: String, default: "", trim: true },
    appliedBy: { type: String, default: "admin" },
  },
  { timestamps: true }
);

export default mongoose.model("MarginLedger", marginLedgerSchema);
