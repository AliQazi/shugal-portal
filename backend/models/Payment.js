import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    voucherId: {
      type: String,
      unique: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bank",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    receipt: {
      type: String, // Cloudinary URL
      default: null,
    },
    receiptPublicId: {
      type: String, // Cloudinary public ID
      default: null,
    },
    status: {
      type: String,
      enum: ["Un Posted", "Posted", "Cancelled"],
      default: "Un Posted",
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Generate voucher ID automatically before saving
paymentSchema.pre("save", async function () {
  if (!this.voucherId) {
    const count = await mongoose.model("Payment").countDocuments();
    this.voucherId = `PRV-${count + 1}`;
  }
});

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
