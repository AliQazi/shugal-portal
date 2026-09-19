import MarginRule from "../models/MarginRule.js";
import MarginLedger from "../models/MarginLedger.js";
import {
  buildRuleKey,
  buildUmrahRuleKey,
  normalizeRuleSector,
  normalizeUmrahSource,
} from "../utils/marginRules.js";

const FLIGHT_LEVELS = ["provider", "sector", "flight"];
const UMRAH_LEVELS = ["umrah-source", "umrah-package"];

class RuleInputError extends Error {}

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

// Validates one rule change and resolves its key. Throws RuleInputError.
const normalizeRuleInput = ({ level, source, sector, groupId, margin, visible }) => {
  const isUmrah = UMRAH_LEVELS.includes(level);
  if (!isUmrah && !FLIGHT_LEVELS.includes(level)) {
    throw new RuleInputError("Unknown rule level");
  }

  const cleanSource = isUmrah ? normalizeUmrahSource(source) : source;
  if (!cleanSource) throw new RuleInputError("A valid source is required");
  if (level === "sector" && !sector) throw new RuleInputError("sector is required");
  if ((level === "flight" || level === "umrah-package") && !groupId) {
    throw new RuleInputError("groupId is required");
  }

  const update = {};
  if (margin !== undefined) {
    const parsed = Number(margin);
    if (!Number.isFinite(parsed) || parsed < 0) throw new RuleInputError("margin must be >= 0");
    update.margin = parsed;
  }
  if (visible !== undefined) update.visible = Boolean(visible);
  if (!Object.keys(update).length) throw new RuleInputError("Nothing to update");

  const target = { level, source: cleanSource, sector, groupId: groupId === undefined ? groupId : String(groupId) };
  const ruleKey = isUmrah ? buildUmrahRuleKey(target) : buildRuleKey(target);

  return { ...target, update, ruleKey };
};

// Upserts one rule (partial: margin, visible, or both) and writes the audit
// trail. A rule that returns to the defaults (margin 0 + visible) is deleted
// so the collection stays small.
const applyRule = async (input, actor) => {
  const { level, source, sector, groupId, update, ruleKey } = normalizeRuleInput(input);

  const before = await MarginRule.findOne({ ruleKey }).lean();
  const rule = await MarginRule.findOneAndUpdate(
    { ruleKey },
    {
      $set: { ...update, updatedBy: actor },
      $setOnInsert: {
        ruleKey,
        level,
        source,
        sector: ["sector"].includes(level) ? normalizeRuleSector(sector || "") : "",
        groupId: ["flight", "umrah-package"].includes(level) ? String(groupId) : "",
      },
    },
    { upsert: true, new: true },
  );

  const audit = (entryType, note) =>
    MarginLedger.create({
      entryType,
      groupId: ruleKey,
      source,
      sector: rule.sector,
      marginAmount: rule.margin,
      note,
      appliedBy: actor,
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

  return { ruleKey, margin: rule.margin, visible: rule.visible };
};

const fail = (res, err) => {
  if (err instanceof RuleInputError) {
    return res.status(400).json({ success: false, message: err.message });
  }
  console.error("margin rule error:", err);
  return res.status(500).json({ success: false, message: err.message });
};

export const setMarginRule = async (req, res) => {
  try {
    const data = await applyRule(req.body, req.user?.name || "admin");
    res.status(200).json({ success: true, data });
  } catch (err) {
    fail(res, err);
  }
};

// Bulk show/hide/margin: body { rules: [{ level, source, groupId, visible?, margin? }] }
export const setMarginRulesBulk = async (req, res) => {
  try {
    const rules = req.body?.rules;
    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({ success: false, message: "rules array is required" });
    }
    if (rules.length > 1000) {
      return res.status(400).json({ success: false, message: "Too many rules in one request" });
    }

    // Validate everything first so a bad row cannot leave a half-applied bulk.
    rules.forEach(normalizeRuleInput);

    const actor = req.user?.name || "admin";
    const data = {};
    for (const rule of rules) {
      const result = await applyRule(rule, actor);
      data[result.ruleKey] = { margin: result.margin, visible: result.visible };
    }
    // keys whose rule fell back to defaults were deleted — report them too
    res.status(200).json({ success: true, data, count: rules.length });
  } catch (err) {
    fail(res, err);
  }
};
