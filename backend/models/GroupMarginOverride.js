import mongoose from "mongoose";

/**
 * Stores an admin-set fixed-PKR margin override for a specific API group.
 * The composite key is `source + groupId` (stored together as `overrideKey`).
 */
const groupMarginOverrideSchema = new mongoose.Schema(
  {
    // e.g.  "al-haider-GRP001"  or  "travel-network-TN123"
    overrideKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    groupId: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    sector: {
      type: String,
      default: "",
    },
    flightNo: {
      type: String,
      default: "",
    },
    marginAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    appliedBy: {
      type: String,
      default: "admin",
    },
  },
  { timestamps: true }
);

export default mongoose.model("GroupMarginOverride", groupMarginOverrideSchema);
