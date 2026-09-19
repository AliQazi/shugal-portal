import crypto from "crypto";
import MarginRule from "../models/MarginRule.js";

export const normalizeRuleSector = (sector = "") =>
  String(sector)
    .split("-")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean)
    .join("-");

export const providerKey = (source) => `provider|${source}`;
export const sectorKey = (source, sector) =>
  `sector|${source}|${normalizeRuleSector(sector)}`;
export const flightKey = (source, groupId) => `flight|${source}|${groupId}`;

export const buildRuleKey = ({ level, source, sector, groupId }) => {
  if (level === "provider") return providerKey(source);
  if (level === "sector") return sectorKey(source, sector);
  return flightKey(source, groupId);
};

export const loadRuleMap = async () => {
  const rules = await MarginRule.find({}).lean();
  return new Map(rules.map((r) => [r.ruleKey, r]));
};

/**
 * Resolve the cumulative margin and visibility of one group.
 * Returns the per-level breakdown so the admin UI can display it.
 */
export const resolveGroupRules = (group, ruleMap) => {
  const source = group.source || "admin";
  const keys = {
    provider: providerKey(source),
    sector: sectorKey(source, group.sector),
    flight: flightKey(source, group.id),
  };

  const levels = {};
  let total = 0;
  const hiddenBy = [];

  for (const level of ["provider", "sector", "flight"]) {
    const rule = ruleMap.get(keys[level]);
    const margin = Number(rule?.margin || 0);
    const visible = rule ? rule.visible !== false : true;
    levels[level] = { margin, visible };
    total += margin;
    if (!visible) hiddenBy.push(level);
  }

  return { keys, levels, total, visible: hiddenBy.length === 0, hiddenBy };
};

/* ───────────────────────── margin token ─────────────────────────
 * Agents get their group price with the admin margin already added, so the
 * client can no longer tell the true base price. The token is an encrypted
 * snapshot ({rule keys, per-pax margin, per-level margins}) that the booking
 * form sends back, letting the server recover the exact base price and lock
 * the margin that was shown — even if the rules changed in between.
 * It is encrypted (not just signed) so agents cannot read the markup.
 */

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

const tokenKey = () =>
  crypto
    .createHash("sha256")
    .update(`margin-token:${process.env.JWT_SECRET || ""}`)
    .digest();

export const signMarginToken = (payload) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", tokenKey(), iv);
  const enc = Buffer.concat([
    cipher.update(JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL_MS }), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64url");
};

/** Returns the payload, or throws a user-facing Error. */
export const readMarginToken = (token) => {
  try {
    const raw = Buffer.from(String(token), "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", tokenKey(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const json = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    const payload = JSON.parse(json);
    if (!payload.exp || payload.exp < Date.now()) throw new Error("expired");
    return payload;
  } catch {
    throw new Error("Price information has expired. Please refresh the groups list and try again.");
  }
};

export const buildMarginTokenPayload = (group, rules) => ({
  k: rules.keys,
  m: rules.total,
  l: [rules.levels.provider.margin, rules.levels.sector.margin, rules.levels.flight.margin],
});

const STALE_MSG = "Price information has changed. Please refresh the groups list and try again.";
const HIDDEN_MSG = "This group is no longer available.";

/**
 * Server-side margin context for a new booking.
 * Admins book at face value. For everyone else: the group must still be
 * visible under the current rules, and the margin comes from the snapshot
 * token (exact price the agent was shown).
 */
export const resolveBookingMargin = async ({ user, token, source, groupId, sector }) => {
  const none = { perPax: 0, keys: null, levels: [0, 0, 0] };
  if (user?.role === "Admin") return none;

  const ruleMap = await loadRuleMap();
  const current = resolveGroupRules({ source, sector, id: groupId }, ruleMap);

  if (!token) {
    // No snapshot: only safe when no rule touches this group at all.
    if (!current.visible) throw new Error(HIDDEN_MSG);
    if (current.total > 0) throw new Error(STALE_MSG);
    return none;
  }

  const snap = readMarginToken(token);

  if (snap.k?.flight !== flightKey(source, groupId) || snap.k?.provider !== providerKey(source)) {
    throw new Error(STALE_MSG);
  }

  // Re-check visibility using the snapshot's own keys (sector key included),
  // so a group hidden after the agent loaded the list cannot be booked.
  for (const key of [snap.k.provider, snap.k.sector, snap.k.flight]) {
    const rule = ruleMap.get(key);
    if (rule && rule.visible === false) throw new Error(HIDDEN_MSG);
  }

  return {
    perPax: Math.max(0, Number(snap.m) || 0),
    keys: snap.k,
    levels: (snap.l || [0, 0, 0]).map((n) => Number(n) || 0),
  };
};
