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

/* ───────────────────── Umrah packages (Travel Network + Abid Air) ─────────────────────
 * Two levels, cumulative: one margin/visibility per SOURCE (the "Margin (PKR)"
 * box on each tab) and an optional one per PACKAGE. The margin is added to
 * every room type (sharing/double/triple/quad/...) and the child fare; infant
 * fares are left alone.
 */
export const UMRAH_RULE_SOURCES = ["travel-network", "abidairtravel"];

export const umrahSourceKey = (source) => `usrc|${source}`;
export const umrahPackageKey = (source, id) => `upkg|${source}|${id}`;

const UMRAH_LEVEL_KEY = {
  "umrah-source": (r) => umrahSourceKey(r.source),
  "umrah-package": (r) => umrahPackageKey(r.source, r.groupId),
};
export const buildUmrahRuleKey = (rule) => UMRAH_LEVEL_KEY[rule.level]?.(rule);

const UMRAH_SOURCE_ALIASES = {
  "travel-network": "travel-network",
  travelnetwork: "travel-network",
  tn: "travel-network",
  abidairtravel: "abidairtravel",
  "abid-air": "abidairtravel",
  abidair: "abidairtravel",
};

export const normalizeUmrahSource = (value) =>
  UMRAH_SOURCE_ALIASES[
    String(value || "").toLowerCase().trim().replace(/[\s_]+/g, "-")
  ] || null;

/** {source, id} for an Umrah package coming from TN or Abid Air, else null
 *  (local packages and flight groups are not managed by these rules). */
export const umrahPackageIdentity = (pkg) => {
  const source = normalizeUmrahSource(pkg?.source || pkg?.packageSource);
  if (!source) return null;

  const isPackage =
    source === "travel-network" ||
    pkg.abidAirBookingType === "package" ||
    Boolean(pkg.hotels && (pkg.rates || pkg.rooms));
  if (!isPackage) return null;

  const id = pkg.package_id ?? pkg.packageId ?? pkg.id;
  if (id === undefined || id === null || id === "") return null;
  return { source, id: String(id) };
};

export const resolveUmrahRules = ({ source, id }, ruleMap) => {
  const keys = { source: umrahSourceKey(source), package: umrahPackageKey(source, id) };
  const levels = {};
  let total = 0;
  const hiddenBy = [];

  for (const level of ["source", "package"]) {
    const rule = ruleMap.get(keys[level]);
    const margin = Number(rule?.margin || 0);
    const visible = rule ? rule.visible !== false : true;
    levels[level] = { margin, visible };
    total += margin;
    if (!visible) hiddenBy.push(level);
  }

  return { keys, levels, total, visible: hiddenBy.length === 0, hiddenBy };
};

// Room + child fares that carry the margin (everything but infant).
const addToFares = (fares, margin) => {
  if (!fares || typeof fares !== "object" || Array.isArray(fares)) return fares;
  const out = { ...fares };
  for (const [key, value] of Object.entries(out)) {
    if (key === "infant" || key === "incentive") continue;
    const n = Number(value);
    if (Number.isFinite(n) && n > 0 && typeof value !== "object") out[key] = n + margin;
  }
  return out;
};

export const applyUmrahMargin = (pkg, margin) => {
  if (!(margin > 0)) return pkg;
  const bump = (n) => (Number(n) > 0 ? Number(n) + margin : n);
  return {
    ...pkg,
    ...(pkg.rates && { rates: addToFares(pkg.rates, margin) }),
    ...(pkg.rooms && { rooms: addToFares(pkg.rooms, margin) }),
    ...(pkg.price !== undefined && { price: bump(pkg.price) }),
    ...(pkg.childPrice !== undefined && { childPrice: bump(pkg.childPrice) }),
    marginApplied: true,
  };
};

/** Undo applyUmrahMargin on a package snapshot the client sent back. */
export const stripUmrahMargin = (snapshot, margin) => {
  if (!snapshot || typeof snapshot !== "object" || !(margin > 0)) return snapshot;
  const drop = (fares) => {
    if (!fares || typeof fares !== "object" || Array.isArray(fares)) return fares;
    const out = { ...fares };
    for (const [key, value] of Object.entries(out)) {
      if (key === "infant" || key === "incentive") continue;
      const n = Number(value);
      if (Number.isFinite(n) && n > 0 && typeof value !== "object") out[key] = Math.max(0, n - margin);
    }
    return out;
  };
  const dropOne = (n) => (Number(n) > 0 ? Math.max(0, Number(n) - margin) : n);
  return {
    ...snapshot,
    ...(snapshot.rates && { rates: drop(snapshot.rates) }),
    ...(snapshot.rooms && { rooms: drop(snapshot.rooms) }),
    ...(snapshot.price !== undefined && { price: dropOne(snapshot.price) }),
    ...(snapshot.childPrice !== undefined && { childPrice: dropOne(snapshot.childPrice) }),
  };
};

/**
 * Booking-time check for an Umrah package. Same contract as
 * resolveBookingMargin: admins bypass; everyone else must present a valid
 * snapshot token, and the package must still be visible.
 */
export const resolveUmrahBookingMargin = async ({ user, token, packageSource, packageId }) => {
  const none = { perPax: 0, keys: null, levels: [0, 0] };
  const source = normalizeUmrahSource(packageSource);
  if (!source || user?.role === "Admin") return none;

  const ruleMap = await loadRuleMap();
  const current = resolveUmrahRules({ source, id: String(packageId) }, ruleMap);

  if (!token) {
    if (!current.visible) throw new Error(HIDDEN_MSG);
    if (current.total > 0) throw new Error(STALE_MSG);
    return none;
  }

  const snap = readMarginToken(token);
  if (
    snap.k?.package !== umrahPackageKey(source, String(packageId)) ||
    snap.k?.source !== umrahSourceKey(source)
  ) {
    throw new Error(STALE_MSG);
  }

  for (const key of [snap.k.source, snap.k.package]) {
    const rule = ruleMap.get(key);
    if (rule && rule.visible === false) throw new Error(HIDDEN_MSG);
  }

  return {
    perPax: Math.max(0, Number(snap.m) || 0),
    keys: snap.k,
    levels: (snap.l || [0, 0]).map((n) => Number(n) || 0),
  };
};
