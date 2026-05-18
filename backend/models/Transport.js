import mongoose from "mongoose";

const TransportSchema = new mongoose.Schema(
  {
    route: {
      type: String,
      required: [true, "Route is required"],
      trim: true,
    },
    transportType: {
      type: String,
      required: [true, "Transport type is required"],
      trim: true,
    },
  },
  { timestamps: true }
);

const Transport = mongoose.model("Transport", TransportSchema);
export default Transport;
