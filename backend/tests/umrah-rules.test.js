import test from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test-secret";

const { default: MarginRule } = await import("../models/MarginRule.js");
let rules = [];
MarginRule.find = () => ({ lean: async () => rules });

const U = await import("../utils/marginRules.js");
const { applyUmrahPackageRules } = await import("../middleware/marginVisibility.middleware.js");

const tnPkg = (id, over = {}) => ({
  package_id: id,
  source: "travel-network",
  rooms: { double: 331672, triple: 298100, quad: 281776, sharing: 275000, child_without_bed: 200000, infant: 30000 },
  price: 275000,
  ...over,
});
const abidPkg = (id) => ({
  package_id: id,
  source: "abidairtravel",
  abidAirBookingType: "package",
  hotels: [],
  rates: { sharing: 220000, quad: 235000, triple: 255000, double: 285000, child_without_bed: 125000, infant: 45000 },
  price: 220000,
  childPrice: 125000,
});
const abidFlight = { id: "f1", source: "abidairtravel", abidAirBookingType: "flight", price: 100 };

const list = async (data, { admin = false } = {}) => {
  let out;
  const res = { set() {}, json(b) { out = b; return b; } };
  // admin detection needs a JWT + Register lookup, so stub the model call
  const req = { headers: {} };
  if (admin) {
    const jwt = (await import("jsonwebtoken")).default;
    const { default: Register } = await import("../models/Register.js");
    Register.findById = () => ({ select: () => ({ lean: async () => ({ role: "Admin" }) }) });
    req.headers.authorization = `Bearer ${jwt.sign({ id: "a" }, process.env.JWT_SECRET)}`;
  }
  await applyUmrahPackageRules(req, res, () => {});
  res.json({ success: true, data });
  return out.data;
};

test("identity: only TN / Abid packages are managed; flights and local are not", () => {
  assert.deepEqual(U.umrahPackageIdentity(tnPkg(614)), { source: "travel-network", id: "614" });
  assert.deepEqual(U.umrahPackageIdentity(abidPkg("abc")), { source: "abidairtravel", id: "abc" });
  assert.equal(U.umrahPackageIdentity(abidFlight), null);
  assert.equal(U.umrahPackageIdentity({ source: "local", package_id: 1 }), null);
});

test("agent: source margin hits EVERY room type + child, never infant; token attached", async () => {
  rules = [{ ruleKey: "usrc|travel-network", margin: 8000, visible: true }];
  const [p] = await list([tnPkg(614)]);
  assert.equal(p.rooms.double, 339672);
  assert.equal(p.rooms.triple, 306100);
  assert.equal(p.rooms.quad, 289776);
  assert.equal(p.rooms.sharing, 283000);
  assert.equal(p.rooms.child_without_bed, 208000);
  assert.equal(p.rooms.infant, 30000);
  assert.equal(p.price, 283000);
  assert.equal(p.marginApplied, true);
  assert.ok(p.marginToken);
});

test("agent: source + package margins are cumulative; other sources untouched", async () => {
  rules = [
    { ruleKey: "usrc|travel-network", margin: 8000, visible: true },
    { ruleKey: "upkg|travel-network|614", margin: 1000, visible: true },
  ];
  const out = await list([tnPkg(614), tnPkg(617), abidPkg("x")]);
  assert.equal(out[0].rooms.double, 331672 + 9000);
  assert.equal(out[1].rooms.double, 331672 + 8000);
  assert.equal(out[2].rates.double, 285000); // Abid has no rule
});

test("agent: hidden at source level or package level removes it; flights never leak through", async () => {
  rules = [
    { ruleKey: "usrc|abidairtravel", margin: 0, visible: false },
    { ruleKey: "upkg|travel-network|617", margin: 0, visible: false },
  ];
  const out = await list([tnPkg(614), tnPkg(617), abidPkg("x"), abidFlight]);
  assert.deepEqual(out.map((p) => String(p.package_id ?? p.id)), ["614"]);
});

test("admin: sees everything (hidden too), base prices untouched, ruleInfo attached", async () => {
  rules = [
    { ruleKey: "usrc|travel-network", margin: 8000, visible: true },
    { ruleKey: "upkg|travel-network|617", margin: 0, visible: false },
  ];
  const out = await list([tnPkg(614), tnPkg(617), abidFlight], { admin: true });
  assert.equal(out.length, 3);
  assert.equal(out[0].rooms.double, 331672);
  assert.equal(out[0].ruleInfo.totalMargin, 8000);
  assert.deepEqual(out[1].ruleInfo.hiddenBy, ["package"]);
});

test("booking: token gives the locked margin; strip restores the supplier price", async () => {
  rules = [{ ruleKey: "usrc|travel-network", margin: 8000, visible: true }];
  const [p] = await list([tnPkg(614)]);
  const ctx = await U.resolveUmrahBookingMargin({
    user: { role: "Agency" },
    token: p.marginToken,
    packageSource: "travel-network",
    packageId: 614,
  });
  assert.equal(ctx.perPax, 8000);
  const base = U.stripUmrahMargin(p, ctx.perPax);
  assert.equal(base.rooms.double, 331672);
  assert.equal(base.rooms.infant, 30000);
  assert.equal(base.price, 275000);
});

test("booking: hidden after listing, wrong package, missing token with margin, garbage token", async () => {
  rules = [{ ruleKey: "usrc|travel-network", margin: 8000, visible: true }];
  const [p] = await list([tnPkg(614)]);
  const agent = { role: "Agency" };

  await assert.rejects(U.resolveUmrahBookingMargin({ user: agent, token: p.marginToken, packageSource: "travel-network", packageId: 999 }), /refresh/i);
  await assert.rejects(U.resolveUmrahBookingMargin({ user: agent, token: undefined, packageSource: "travel-network", packageId: 614 }), /refresh/i);
  await assert.rejects(U.resolveUmrahBookingMargin({ user: agent, token: "junk", packageSource: "travel-network", packageId: 614 }), /refresh/i);

  rules = [{ ruleKey: "upkg|travel-network|614", margin: 0, visible: false }];
  await assert.rejects(U.resolveUmrahBookingMargin({ user: agent, token: p.marginToken, packageSource: "travel-network", packageId: 614 }), /no longer available/);
});

test("booking: local packages and admins bypass; no rules + no token is allowed", async () => {
  rules = [];
  const a = await U.resolveUmrahBookingMargin({ user: { role: "Agency" }, packageSource: "local", packageId: "x" });
  assert.equal(a.perPax, 0);
  const b = await U.resolveUmrahBookingMargin({ user: { role: "Admin" }, packageSource: "travel-network", packageId: 1 });
  assert.equal(b.perPax, 0);
  const c = await U.resolveUmrahBookingMargin({ user: { role: "Agency" }, packageSource: "abidairtravel", packageId: "q" });
  assert.equal(c.perPax, 0);
});
