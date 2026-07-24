import mongoose from "mongoose";

const GroupBookingTokenSchema = new mongoose.Schema(
  {
    idToken: { type: String, default: null },
    accessToken: { type: String, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const GroupBookingToken = mongoose.model(
  "GroupBookingToken",
  GroupBookingTokenSchema,
);

export default GroupBookingToken;
