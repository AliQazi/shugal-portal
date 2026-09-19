import mongoose from "mongoose";

const PassengerSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Adult", "Child", "Infant"], default: "Adult" },
    title: { type: String, default: "Mr" },
    givenName: { type: String, default: "" },
    surName: { type: String, default: "" },
    passport: { type: String, default: "" },
    dateOfBirth: { type: String, default: "" },
    passportExpiry: { type: String, default: "" },
    nationality: { type: String, default: "Pakistan" },
    passportFileUrl: { type: String, default: "" }, // Cloudinary URL
  },
  { _id: false }
);

const UmrahPackageBookingSchema = new mongoose.Schema(
  {
    bookingNumber: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Register", required: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "UmrahPackage", default: null },
    packageName: { type: String, default: "" },
    packageSource: { type: String, default: "local" },
    providerBookingStatus: {
      type: String,
      enum: ["not_applicable", "success", "failed"],
      default: "not_applicable",
    },
    providerPackageBookingId: { type: String, default: null },
    providerTicketId: { type: String, default: null },
    providerBookingResponse: { type: mongoose.Schema.Types.Mixed, default: null },

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
    // Admin margin locked at booking time (per adult/child, all room types).
    // Set server-side only — never taken from the client.
    marginSnapshot: {
      perPax: { type: Number, default: 0 },
      source: { type: Number, default: 0 },
      package: { type: Number, default: 0 },
      keys: {
        source: { type: String, default: "" },
        package: { type: String, default: "" },
      },
    },
    // Supplier hold expiry (Abid Air on-hold bookings); null for everything else
    expiresAt: { type: Date, default: null, index: true },
    pnr: { type: String, trim: true, default: "" },
    packageData: { type: mongoose.Schema.Types.Mixed, default: {} }, // snapshot

    roomType: { type: String, default: "" },
    adultsCount: { type: Number, default: 0 },
    childrenCount: { type: Number, default: 0 },
    infantsCount: { type: Number, default: 0 },
    passengers: [PassengerSchema],
    specialRequests: { type: String, default: "" },

    pricing: {
      pricePerPerson: { type: Number, default: 0 },
      currency: { type: String, default: "PKR" },
      totalAmount: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      originalTotalAmount: { type: Number, default: 0 },
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    adminNote: { type: String, default: "" },
  },
  { timestamps: true }
);

// Auto-generate booking number before save
UmrahPackageBookingSchema.pre("save", async function () {
  if (!this.bookingNumber) {
    const count = await this.constructor.countDocuments();
    this.bookingNumber = `UPB-${String(count + 1).padStart(5, "0")}`;
  }
});

export default mongoose.model("UmrahPackageBooking", UmrahPackageBookingSchema);
