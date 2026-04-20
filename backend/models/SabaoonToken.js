import mongoose from "mongoose";

const SabaoonTokenSchema = new mongoose.Schema(
    {
        token: { type: String, default: null },
        expiry: { type: Date, default: null },
    },
    { timestamps: true },
);

const SabaoonToken = mongoose.model("SabaoonToken", SabaoonTokenSchema);

export default SabaoonToken;