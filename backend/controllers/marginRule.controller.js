import MarginRule from "../models/MarginRule.js";
import MarginLedger from "../models/MarginLedger.js";
import { buildRuleKey, normalizeRuleSector } from "../utils/marginRules.js";

export const getMarginRules = async (req, res) => {
  try {
    const rules = await MarginRule.find({}).lean();
    const map = {};
    rules.forEach((r) => {
      map[r.ruleKey] = { margin: r.margin, visible: r.visible };
    });
    res.status(200).json({ success: true, data: map });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Partial upsert: send `margin`, `visible`, or both. A rule that goes back to
// the defaults (margin 0 + visible) is deleted so the collection stays small.
export const setMarginRule = async (req, res) => {
  try {
    const { level, source, sector, groupId, margin, visible } = req.body;

    if (!["provider", "sector", "flight"].includes(level) || !source) {
      return res
        .status(400)
        .json({ success: false, message: "level and source are required" });
    }
    if (level === "sector" && !sector) {
      return res
        .status(400)
        .json({ success: false, message: "sector is required" });
    }
    if (level === "flight" && !groupId) {
      return res
        .status(400)
        .json({ success: false, message: "groupId is required" });
    }

    const update = {};
    if (margin !== undefined) {
      const parsed = Number(margin);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return res
          .status(400)
          .json({ success: false, message: "margin must be >= 0" });
      }
      update.margin = parsed;
    }
    if (visible !== undefined) update.visible = Boolean(visible);

    const ruleKey = buildRuleKey({ level, source, sector, groupId });

    const before = await MarginRule.findOne({ ruleKey }).lean();
    const rule = await MarginRule.findOneAndUpdate(
      { ruleKey },
      {
        $set: { ...update, updatedBy: req.user?.name || "admin" },
        $setOnInsert: {
          ruleKey,
          level,
          source,
          sector: level === "provider" ? "" : normalizeRuleSector(sector || ""),
          groupId: level === "flight" ? String(groupId) : "",
        },
      },
      { upsert: true, new: true },
    );

    // Audit trail (best effort — never blocks the rule change itself)
    const appliedBy = req.user?.name || "admin";
    const audit = (entryType, note) =>
      MarginLedger.create({
        entryType,
        groupId: ruleKey,
        source,
        sector: level === "provider" ? "" : rule.sector,
        marginAmount: rule.margin,
        note,
        appliedBy,
      }).catch((err) => console.error("margin rule audit failed:", err.message));

    const oldMargin = before?.margin ?? 0;
    const oldVisible = before ? before.visible !== false : true;
    if (update.margin !== undefined && update.margin !== oldMargin) {
      await audit("margin_applied", `${level} margin ${oldMargin} -> ${rule.margin} (${ruleKey})`);
    }
    if (update.visible !== undefined && update.visible !== oldVisible) {
      await audit("visibility_changed", `${level} ${rule.visible ? "shown" : "hidden"} (${ruleKey})`);
    }

    if (rule.margin === 0 && rule.visible !== false) {
      await MarginRule.deleteOne({ _id: rule._id });
    }

    res.status(200).json({
      success: true,
      data: { ruleKey, margin: rule.margin, visible: rule.visible },
    });
  } catch (err) {
    console.error("setMarginRule error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
