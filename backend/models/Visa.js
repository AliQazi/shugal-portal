import mongoose from "mongoose";

const VisaSchema = new mongoose.Schema(
  {
    visaType: {
      type: String,
      required: [true, "Visa type is required"],
      trim: true,
    },
    processingTime: {
      type: Number,
      default: 0,
    },
    buyingPrice: {
      type: Number,
      required: [true, "Buying price is required"],
      default: 0,
    },
    sellingPrice: {
      type: Number,
      required: [true, "Selling price is required"],
      default: 0,
    },
    currency: {
      type: String,
      default: "PKR",
    },
    transport: {
      type: String,
      enum: ["without", "with"],
      default: "without",
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Visa = mongoose.model("Visa", VisaSchema);
export default Visa;
