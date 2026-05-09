import mongoose from "mongoose";

const groupPricingSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      unique: true,
      enum: ["all", "uae", "ksa", "muscat", "umrah"],
    },

    margin: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const GroupPricing = mongoose.model("GroupPricing", groupPricingSchema);

export default GroupPricing;
