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
    packageData: { type: mongoose.Schema.Types.Mixed, default: {} }, // snapshot

    roomType: { type: String, default: "" },
    passengers: [PassengerSchema],
    specialRequests: { type: String, default: "" },

    pricing: {
      pricePerPerson: { type: Number, default: 0 },
      currency: { type: String, default: "PKR" },
      totalAmount: { type: Number, default: 0 },
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
