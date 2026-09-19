import mongoose from "mongoose";

/**
 * Admin-defined margin + visibility rule for one node of the group tree:
 *   provider  -> every group from a provider (source)
 *   sector    -> every group of one sector inside one provider
 *   flight    -> a single group / flight
 *
 * Margins are cumulative (provider + sector + flight). Visibility is an AND:
 * if any level is hidden, agents do not see the group.
 */
const marginRuleSchema = new mongoose.Schema(
  {
    // provider|<source>   sector|<source>|<SECTOR>   flight|<source>|<groupId>
    ruleKey: { type: String, required: true, unique: true, index: true },
    level: {
      type: String,
      enum: ["provider", "sector", "flight"],
      required: true,
    },
    source: { type: String, required: true },
    sector: { type: String, default: "" },
    groupId: { type: String, default: "" },
    margin: { type: Number, default: 0, min: 0 },
    visible: { type: Boolean, default: true },
    updatedBy: { type: String, default: "admin" },
  },
  { timestamps: true },
);

export default mongoose.model("MarginRule", marginRuleSchema);
