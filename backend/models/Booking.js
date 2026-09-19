import mongoose from "mongoose";
import BookingCounter from "./BookingCounter.js";

const passengerSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["Adult", "Child", "Infant"],
  },
  title: {
    type: String,
    required: true,
  },
  givenName: {
    type: String,
    required: true,
    trim: true,
  },
  surName: {
    type: String,
    required: true,
    trim: true,
  },
  passport: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  dateOfBirth: {
    type: Date,
    required: false,
  },
  passportExpiry: {
    type: Date,
    required: false,
  },
  passportIssue: {
    type: Date,
    required: false,
  },
  nationality: {
    type: String,
    required: true,
  },
  documentUrl: {
    type: String,
    default: null,
  },
});

const bookingSchema = new mongoose.Schema(
  {
    // Group and Flight Information
    groupId: {
      type: String,
      required: true,
      index: true,
    },
    groupType: {
      type: String,
      required: true,
    },
    airline: {
      id: String,
      name: {
        type: String,
        required: true,
      },
      logoUrl: String,
    },
    sector: {
      type: String,
      required: true,
    },
    pnr: {
      type: String,
      default: "",
    },

    // Contact Information
    contactPersonName: {
      type: String,
      required: true,
      trim: true,
    },

    // Passenger Counts
    adultsCount: {
      type: Number,
      required: true,
      min: 0,
    },
    childrenCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    infantsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPassengers: {
      type: Number,
      required: true,
    },

    // Pricing Information
    pricing: {
      // Final prices (base + margin applied) — what the agent pays
      adultPrice: {
        type: Number,
        required: true,
      },
      childPrice: {
        type: Number,
        default: 0,
      },
      infantPrice: {
        type: Number,
        default: 0,
      },
      // Original base prices from the group (before any margin) — used for Sabaoon API & admin breakdown
      adultBasePrice: {
        type: Number,
        default: 0,
      },
      childBasePrice: {
        type: Number,
        default: 0,
      },
      infantBasePrice: {
        type: Number,
        default: 0,
      },
      adultTotal: {
        type: Number,
        required: true,
      },
      childTotal: {
        type: Number,
        default: 0,
      },
      infantTotal: {
        type: Number,
        default: 0,
      },
      discountAmount: {
        type: Number,
        default: 0,
      },
      originalGrandTotal: {
        type: Number,
        default: 0,
      },
      grandTotal: {
        type: Number,
        required: true,
      },
      // Snapshot of the group's "Price on Call" flags at the time of booking.
      // Keeps the price hidden from the agent even if the group is edited later.
      priceOnCall: {
        adult: { type: Boolean, default: false },
        child: { type: Boolean, default: false },
        infant: { type: Boolean, default: false },
      },
    },

    // Passenger Details
    passengers: [passengerSchema],

    // Flight Details
    flights: [
      {
        flightNo: String,
        flightDate: Date,
        depDate: Date,
        depTime: String,
        origin: String,
        destination: String,
        arrDate: Date,
        arrTime: String,
        baggage: String,
        meal: String,
      },
    ],

    // Dates
    departureDate: {
      type: Date,
      required: true,
    },
    arrivalDate: {
      type: Date,
    },

    // Booking Status
    status: {
      type: String,
      enum: ["on hold", "confirmed", "cancelled"],
      default: "on hold",
    },

    // User Information
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      required: true,
    },

    // Metadata
    bookingReference: {
      type: String,
      unique: true,
      // Removed index: true to avoid duplicate with schema.index() below
    },
    notes: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true, // helps cron/queries
    },
    source: {
      type: String,
      default: "admin",
      index: true,
    },

    // Admin margin locked at booking time (per adult/child ticket) with the
    // rule levels that produced it. Set server-side only — never from the client.
    marginSnapshot: {
      perPax: { type: Number, default: 0 },
      provider: { type: Number, default: 0 },
      sector: { type: Number, default: 0 },
      flight: { type: Number, default: 0 },
      keys: {
        provider: { type: String, default: "" },
        sector: { type: String, default: "" },
        flight: { type: String, default: "" },
      },
    },

    // Sabaoon API
    sabaoonTransactionId: {
      type: Number,
      default: null,
    },
    sabaoonBookingStatus: {
      type: String,
      enum: ["pending", "success", "failed", "not_applicable"],
      default: "pending",
    },
    // NCT specific fields
    nctBookingId: {
      type: String,
      default: null,
    },
    nctGroupTransactionId: {
      type: String,
      default: null,
    },
    nctBookingStatus: {
      type: String,
      enum: ["pending", "success", "failed", "not_applicable"],
      default: "not_applicable",
    },
    nctRequestStatus: {
      type: String,
      enum: ["pending", "Requested", "failed", "not_applicable"],
      default: "not_applicable",
    },
    nctErrorMessage: {
      type: String,
      default: null,
    },
    nctErrorDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    nctResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    abidAirBookingId: {
      type: String,
      default: null,
    },
    abidAirTicketId: {
      type: String,
      default: null,
    },
    abidAirBookingStatus: {
      type: String,
      enum: ["pending", "success", "failed", "not_applicable"],
      default: "not_applicable",
    },
    abidAirBookingResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    abidAirBookingType: {
      type: String,
      enum: ["flight", "package", null],
      default: null,
    },

    // Abid Air Partner API handoff (supplier* fields are shared with
    // UmrahPackageBooking so one cancel/expiry helper serves both).
    supplierName: { type: String, default: "" },
    supplierBookingId: { type: String, default: null },
    // Supplier status verbatim ("on hold", "cancelled"...) or "supplier_pending"
    // when a 429/5xx left the outcome unknown and it needs reconciling.
    supplierBookingStatus: { type: String, default: null },
    supplierBookingData: { type: mongoose.Schema.Types.Mixed, default: null },
    supplierBookingCreatedAt: { type: Date, default: null },
    supplierPricing: { type: mongoose.Schema.Types.Mixed, default: null },
    supplierPriceMismatch: { type: Boolean, default: false },
    supplierError: { type: mongoose.Schema.Types.Mixed, default: null },

    // MCT specific fields
    mctBookingId: {
      type: String,
      default: null,
    },
    mctBookingStatus: {
      type: String,
      enum: ["pending", "success", "failed", "not_applicable"],
      default: "not_applicable",
    },
    mctErrorMessage: {
      type: String,
      default: null,
    },
    mctResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Generate booking reference before saving
bookingSchema.pre("save", async function () {
  if (this.bookingReference) return;

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const dateString = `${year}${month}${day}`;

  const counter = await BookingCounter.findOneAndUpdate(
    { date: dateString },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true },
  );

  const sequence = String(counter.seq).padStart(4, "0");
  this.bookingReference = `${dateString}${sequence}`;
});

// Index for faster queries
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ bookingReference: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ groupId: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
