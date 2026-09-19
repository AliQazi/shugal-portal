import jwt from "jsonwebtoken";
import Register from "../models/Register.js";
import {
  loadRuleMap,
  resolveGroupRules,
  signMarginToken,
  buildMarginTokenPayload,
  umrahPackageIdentity,
  resolveUmrahRules,
  applyUmrahMargin,
} from "../utils/marginRules.js";

// Token is optional here: no/invalid token is treated as an agent (the
// restrictive path), never as an admin.
const isAdminRequest = async (req) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return false;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Register.findById(decoded.id).select("role").lean();
    return user?.role === "Admin";
  } catch {
    return false;
  }
};

/**
 * Wraps res.json for group-listing endpoints ({ success, data: [...] }).
 *  - Admin: every group is returned untouched (base price) plus `marginInfo`
 *    with the per-level margins, cumulative margin and final agent price.
 *  - Everyone else: hidden groups are dropped and `price` becomes
 *    base + cumulative margin. Rule breakdown is never exposed.
 */
export const applyMarginAndVisibility = async (req, res, next) => {
  try {
    const [isAdmin, ruleMap] = await Promise.all([
      isAdminRequest(req),
      loadRuleMap(),
    ]);

    // Response differs per viewer — never let a shared cache mix them up.
    res.set({ Vary: "Authorization", "Cache-Control": "private, no-store" });

    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (!body?.success || !Array.isArray(body.data)) return originalJson(body);

      const data = [];

      for (const group of body.data) {
        const rules = resolveGroupRules(group, ruleMap);
        const basePrice = Number(group.price || 0);

        if (isAdmin) {
          data.push({
            ...group,
            marginInfo: {
              basePrice,
              keys: rules.keys,
              levels: rules.levels,
              totalMargin: rules.total,
              finalPrice: basePrice + rules.total,
              visible: rules.visible,
              hiddenBy: rules.hiddenBy,
            },
          });
          continue;
        }

        if (!rules.visible) continue;

        // Margin is per ticket: adult + child (seat-occupying) fares. Infant
        // fares and fares that are 0 / "on call" are left untouched.
        const withMargin = (n) => (Number(n) > 0 ? Number(n) + rules.total : n);

        data.push({
          ...group,
          ...(rules.total > 0 && {
            price: withMargin(group.price),
            childPrice: withMargin(group.childPrice),
            marginApplied: true,
          }),
          marginToken: signMarginToken(buildMarginTokenPayload(group, rules)),
        });
      }

      return originalJson({ ...body, total: data.length, data });
    };

    next();
  } catch (err) {
    console.error("applyMarginAndVisibility error:", err);
    next(err);
  }
};

/**
 * Same idea for Umrah package listings (Travel Network + Abid Air).
 *  - Admin: everything, base prices untouched, plus `ruleInfo` per package.
 *  - Everyone else: hidden packages dropped, the margin added to every room
 *    type + child fare, and a `marginToken` for the booking-time re-check.
 *    Items that are not TN/Abid packages (e.g. Abid flight groups in the
 *    shared feed) are never exposed here — flights only go out through
 *    getUnifiedGroups where their own rules apply.
 */
export const applyUmrahPackageRules = async (req, res, next) => {
  try {
    const [isAdmin, ruleMap] = await Promise.all([isAdminRequest(req), loadRuleMap()]);

    res.set({ Vary: "Authorization", "Cache-Control": "private, no-store" });
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (!body?.success || !Array.isArray(body.data)) return originalJson(body);

      const data = [];
      for (const pkg of body.data) {
        const identity = umrahPackageIdentity(pkg);

        if (!identity) {
          if (isAdmin) data.push(pkg);
          continue;
        }

        const rules = resolveUmrahRules(identity, ruleMap);

        if (isAdmin) {
          data.push({
            ...pkg,
            ruleInfo: {
              source: identity.source,
              id: identity.id,
              keys: rules.keys,
              levels: rules.levels,
              totalMargin: rules.total,
              visible: rules.visible,
              hiddenBy: rules.hiddenBy,
            },
          });
          continue;
        }

        if (!rules.visible) continue;

        data.push({
          ...applyUmrahMargin(pkg, rules.total),
          marginToken: signMarginToken({
            k: rules.keys,
            m: rules.total,
            l: [rules.levels.source.margin, rules.levels.package.margin],
          }),
        });
      }

      return originalJson({ ...body, data });
    };

    next();
  } catch (err) {
    console.error("applyUmrahPackageRules error:", err);
    next(err);
  }
};
