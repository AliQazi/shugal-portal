import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";

process.env.ABID_AIR_API_KEY = "aa_live_test_key";
process.env.ABID_AIR_API_URL = "https://abid.test/api/external/v1";

const abid = await import("../utils/Abid-Air.js");

// ── mock transport ────────────────────────────────────────────────────────
let calls = [];
let routes = {};

axios.defaults.adapter = async (config) => {
  const key = `${config.method.toUpperCase()} ${config.url}`;
  calls.push({ key, config, body: config.data ? JSON.parse(config.data) : undefined });
  const handler = routes[key];
  if (!handler) throw new Error(`unmocked ${key}`);
  const { status = 200, data, headers = {} } = handler(config);
  const response = { status, data, headers, config, statusText: String(status) };
  if (status >= 400) {
    throw new axios.AxiosError("failed", String(status), config, {}, response);
  }
  return response;
};

const reset = (r = {}) => {
  calls = [];
  routes = r;
};

const adult = {
  type: "Adult",
  title: "Mr",
  givenName: "Ali",
  surName: "Khan",
  passport: "ab1234567",
  nationality: "Pakistan",
  dateOfBirth: "1990-05-15T00:00:00.000Z",
  passportExpiry: "2032-05-31",
};

// ── passengers ────────────────────────────────────────────────────────────
test("passengers: maps fields, uppercases title, ISO dates", () => {
  const [p] = abid.formatAbidAirPassengers([adult]);
  assert.equal(p.title, "MR");
  assert.equal(p.dateOfBirth, "1990-05-15");
  assert.equal(p.passportExpiry, "2032-05-31");
  assert.equal(p.surName, "Khan");
});

test("passengers: child/infant titles are forced to CHD/INF", () => {
  const out = abid.formatAbidAirPassengers([
    { ...adult, type: "Child", title: "MR" },
    { ...adult, type: "Infant", title: "MR" },
  ]);
  assert.deepEqual(out.map((p) => p.title), ["CHD", "INF"]);
});

test("passengers: umrah requires DOB + expiry and defaults childType", () => {
  assert.throws(
    () => abid.formatAbidAirPassengers([{ ...adult, dateOfBirth: "" }], { isUmrah: true }),
    (e) => e.status === 422 && e.code === "ABID_AIR_PASSENGER_VALIDATION" && e.fields.includes("dateOfBirth"),
  );
  const [child] = abid.formatAbidAirPassengers([{ ...adult, type: "Child" }], { isUmrah: true });
  assert.equal(child.childType, "withoutBed");
});

test("passengers: missing passport / empty list are rejected before any API call", () => {
  reset();
  assert.throws(() => abid.formatAbidAirPassengers([{ ...adult, passport: "" }]), /passport/);
  assert.throws(() => abid.formatAbidAirPassengers([]), (e) => e.code === "ABID_AIR_PASSENGERS_REQUIRED");
  assert.equal(calls.length, 0);
});

test("passengers: invalid date string is flagged, not silently dropped", () => {
  assert.throws(
    () => abid.formatAbidAirPassengers([{ ...adult, passportIssue: "not-a-date" }]),
    /valid passportIssue/,
  );
});

// ── room type ─────────────────────────────────────────────────────────────
test("roomType: names and occupancy numbers map; unsupported is 422", () => {
  assert.equal(abid.toAbidAirRoomType("Double"), "double");
  assert.equal(abid.toAbidAirRoomType(3), "triple");
  assert.equal(abid.toAbidAirRoomType("4"), "quad");
  assert.equal(abid.toAbidAirRoomType("shared"), "sharing");
  assert.throws(() => abid.toAbidAirRoomType("quint"), (e) => e.status === 422);
});

// ── normalizers ───────────────────────────────────────────────────────────
test("group normalizer: keeps Shaheen source key, real seats, id as string, mapped type", () => {
  const g = abid.normalizeAbidAirGroup({
    id: "6a9174db6190d2c2cff3f950",
    groupCode: "GRP-1",
    type: "Umrah Groups",
    sector: "MUX-JED-MUX",
    airline: "PAKISTAN INTERNATIONAL AIRLINE",
    availableSeats: 16,
    fares: { adult: 148000, child: 130000, infant: 30000 },
    flights: [
      { flightNo: "PK-741", depDate: "2030-07-31T00:00:00.000Z", depTime: "22:35", sectorFrom: "MUX", sectorTo: "JED", arrDate: "2030-08-01", arrTime: "02:00" },
    ],
  });
  assert.equal(g.source, "abidairtravel");
  assert.equal(g.partnerApi, true);
  assert.equal(g.type, "UMRAH GROUP");
  assert.equal(g.available_no_of_pax, 16);
  assert.equal(g.price, 148000);
  assert.equal(g.childPrice, 130000);
  assert.equal(g.details[0].dep_date, "2030-07-31");
  assert.equal(g.details[0].origin, "MUX");
  assert.equal(g.airline.short_name, "PK"); // derived from flight number
  assert.equal(g.abidAirBookingType, "flight");
});

test("group normalizer: unknown type is passed through upper-cased; missing sector is derived", () => {
  const g = abid.normalizeAbidAirGroup({
    id: "1",
    type: "Qatar Groups",
    availableSeats: 0,
    fares: {},
    flights: [{ flightNo: "QR-1", depDate: "2030-01-01", sectorFrom: "LHE", sectorTo: "DOH" }],
  });
  assert.equal(g.type, "QATAR GROUPS");
  assert.equal(g.sector, "LHE-DOH");
  assert.equal(g.price, 0);
});

test("package normalizer: emits the shape the Umrah pages parse (rates, hotels[city])", () => {
  const p = abid.normalizeAbidAirPackage({
    id: "65fd12ab34cd56ef7890abcd",
    name: "21 Day Umrah Package",
    days: 21,
    availableRooms: 12,
    packageTotals: { double: 285000, triple: 255000, quad: 235000, shared: 220000, childWithBed: 195000, childWithoutBed: 125000, infant: 45000 },
    hotels: [
      { name: "Hilton", location: "Makkah", rating: 5, nights: 10 },
      { name: "Anwar", location: "Madina", rating: 4, nights: 8 },
    ],
    flights: [{ flightNo: "SV-701", depDate: "2030-03-01", sectorFrom: "ISB", sectorTo: "JED" }],
  });
  assert.equal(p.source, "abidairtravel");
  assert.equal(p.abidAirBookingType, "package");
  assert.equal(p.package_id, "65fd12ab34cd56ef7890abcd");
  assert.equal(p.rates.sharing, 220000);
  assert.equal(p.rates.child_without_bed, 125000);
  assert.equal(p.available_no_of_pax, 12);
  assert.equal(p.packageDuration, 21);
  assert.deepEqual(p.hotels.map((h) => h.city), ["Makkah", "Madinah"]);
  assert.equal(p.flights[0].sectorTo, "JED");
});

// ── client / handoff ──────────────────────────────────────────────────────
test("client: sends Bearer key, paginates every page of inventory", async () => {
  reset({
    "GET /group-ticketing": (config) => ({
      data: {
        data: [{ id: `g${config.params.page}` }],
        meta: { pages: config.params.page === 1 ? 3 : 3 },
      },
    }),
  });
  const groups = await abid.getGroupTicketing();
  assert.equal(groups.length, 3);
  assert.equal(calls[0].config.headers.Authorization, "Bearer aa_live_test_key");
});

test("handoff: availability token is forwarded and NO local prices are sent", async () => {
  reset({
    "GET /group-ticketing/6a91": () => ({ data: { data: { id: "6a91" } } }),
    "POST /availability": () => ({ data: { data: { available: true, availabilityToken: "TOKEN123" } } }),
    "POST /bookings": () => ({
      status: 201,
      data: {
        data: {
          _id: "BK1",
          status: "on hold",
          expiresAt: "2030-01-01T10:00:00.000Z",
          pricing: { adultPrice: 148000, grandTotal: 148000 },
        },
      },
    }),
  });

  const handoff = await abid.prepareAbidAirHandoff({
    inventoryId: "6a91",
    isPackage: false,
    adults: 1,
    children: 0,
    infants: 0,
    passengers: [adult],
  });
  const result = await abid.sendAbidAirHandoff(handoff, {
    contactPersonName: "Ali",
    expectedBaseTotal: 148000,
  });

  const booking = calls.find((c) => c.key === "POST /bookings");
  assert.equal(booking.config.headers["X-Availability-Token"], "TOKEN123");
  assert.equal(booking.body.inventoryId, "6a91");
  assert.ok(!("pricing" in booking.body) && !("price" in booking.body));
  assert.equal(result.supplierBookingId, "BK1");
  assert.equal(result.supplierName, "Abid Air International");
  assert.equal(result.supplierPriceMismatch, false);
  assert.equal(result.expiresAt.toISOString(), "2030-01-01T10:00:00.000Z");
});

test("handoff: supplier total differing from base quote is flagged, not blocked", async () => {
  reset({
    "POST /bookings": () => ({ status: 201, data: { data: { _id: "BK2", status: "on hold", pricing: { grandTotal: 150000 } } } }),
  });
  const r = await abid.sendAbidAirHandoff(
    { inventoryId: "x", availabilityToken: "T", passengers: [] },
    { contactPersonName: "A", expectedBaseTotal: 148000 },
  );
  assert.equal(r.supplierPriceMismatch, true);
});

test("handoff: package needs roomType and a valid one is sent", async () => {
  reset({
    "GET /umrah-packages/pk1": () => ({ data: { data: { id: "pk1" } } }),
    "POST /availability": (c) => ({ data: { data: { available: true, availabilityToken: "T" } } }),
  });
  const handoff = await abid.prepareAbidAirHandoff({
    inventoryId: "pk1",
    isPackage: true,
    adults: 2,
    children: 0,
    infants: 0,
    passengers: [adult, adult],
    roomType: 2,
  });
  assert.equal(handoff.roomType, "double");

  await assert.rejects(
    abid.prepareAbidAirHandoff({ inventoryId: "pk1", isPackage: true, adults: 1, children: 0, infants: 0, passengers: [adult], roomType: "quint" }),
    (e) => e.code === "ABID_AIR_ROOM_TYPE",
  );
});

test("handoff: unavailable inventory becomes a 409 before any booking call", async () => {
  reset({
    "GET /group-ticketing/g": () => ({ data: { data: { id: "g" } } }),
    "POST /availability": () => ({ data: { data: { available: false, requestedUnits: 3, availableUnits: 1 } } }),
  });
  await assert.rejects(
    abid.prepareAbidAirHandoff({ inventoryId: "g", isPackage: false, adults: 3, children: 0, infants: 0, passengers: [adult, adult, adult] }),
    (e) => e.status === 409 && e.code === "INSUFFICIENT_INVENTORY",
  );
  assert.ok(!calls.some((c) => c.key === "POST /bookings"));
});

test("errors: status, supplier code, Retry-After and request id are preserved", async () => {
  reset({
    "POST /availability": () => ({
      status: 429,
      headers: { "retry-after": "30", "x-request-id": "req-9" },
      data: { success: false, error: { code: "RATE_LIMITED", message: "Slow down" } },
    }),
  });
  await assert.rejects(abid.checkAvailability({ inventoryId: "x", adults: 1 }), (e) => {
    assert.equal(e.name, "AbidAirApiError");
    assert.equal(e.status, 429);
    assert.equal(e.code, "RATE_LIMITED");
    assert.equal(e.retryAfter, "30");
    assert.equal(e.requestId, "req-9");
    assert.equal(abid.isUncertainAbidAirOutcome(e), true);
    assert.equal(abid.abidAirErrorBody(e).retryAfter, "30");
    return true;
  });
});

test("errors: 409/422 are definite failures, 5xx is uncertain and mapped to 502", () => {
  assert.equal(abid.isUncertainAbidAirOutcome({ status: 409 }), false);
  assert.equal(abid.isUncertainAbidAirOutcome({ status: 422 }), false);
  assert.equal(abid.isUncertainAbidAirOutcome({ status: 500 }), true);
  assert.equal(abid.getAbidAirHttpStatus({ status: 500 }), 502);
  assert.equal(abid.getAbidAirHttpStatus({ status: 422 }), 422);
});

test("errors: the API key never appears in logged/safe error output", async () => {
  reset({ "POST /availability": () => ({ status: 401, data: { error: { code: "UNAUTHORIZED", message: "bad key" } } }) });
  await assert.rejects(abid.checkAvailability({ inventoryId: "x", adults: 1 }), (e) => {
    assert.ok(!JSON.stringify(abid.abidAirSafeError(e)).includes("aa_live_test_key"));
    return true;
  });
});

test("booking is not created without an availability token", async () => {
  reset();
  await assert.rejects(abid.createBooking({ inventoryId: "x" }, ""), (e) => e.code === "ABID_AIR_TOKEN_REQUIRED");
  assert.equal(calls.length, 0);
});

// ── cancellation ──────────────────────────────────────────────────────────
const partnerDoc = (over = {}) => ({
  supplierName: "Abid Air International",
  supplierBookingId: "BK1",
  supplierBookingStatus: "on hold",
  supplierBookingData: {},
  ...over,
});

test("cancel: legacy bookings (no supplierName) are skipped", async () => {
  reset();
  assert.deepEqual(await abid.cancelAbidAirSupplierBooking({ supplierName: "" }), { skipped: true });
  assert.equal(calls.length, 0);
});

test("cancel: on-hold partner booking calls the cancel endpoint and records the result", async () => {
  reset({ "POST /bookings/BK1/cancel": () => ({ data: { data: { _id: "BK1", status: "cancelled" } } }) });
  const doc = partnerDoc();
  await abid.cancelAbidAirSupplierBooking(doc);
  assert.equal(doc.supplierBookingStatus, "cancelled");
  assert.equal(doc.supplierBookingData.cancellation.status, "cancelled");
});

test("cancel: supplier_pending / missing id needs reconciliation (409), nothing is called", async () => {
  reset();
  await assert.rejects(
    abid.cancelAbidAirSupplierBooking(partnerDoc({ supplierBookingStatus: "supplier_pending" })),
    (e) => e.status === 409 && e.code === "ABID_AIR_RECONCILIATION_REQUIRED",
  );
  await assert.rejects(
    abid.cancelAbidAirSupplierBooking(partnerDoc({ supplierBookingId: null })),
    (e) => e.code === "ABID_AIR_RECONCILIATION_REQUIRED",
  );
  assert.equal(calls.length, 0);
});

test("cancel: already-cancelled is a no-op; confirmed-at-supplier is refused", async () => {
  reset();
  assert.deepEqual(
    await abid.cancelAbidAirSupplierBooking(partnerDoc({ supplierBookingStatus: "cancelled" })),
    { skipped: true },
  );
  await assert.rejects(
    abid.cancelAbidAirSupplierBooking(partnerDoc({ supplierBookingStatus: "confirmed" })),
    (e) => e.code === "ABID_AIR_INVALID_CANCELLATION_STATE",
  );
  assert.equal(calls.length, 0);
});

test("cancel: a supplier failure propagates and leaves the local doc untouched", async () => {
  reset({ "POST /bookings/BK1/cancel": () => ({ status: 500, data: { error: { code: "SERVER_ERROR", message: "boom" } } }) });
  const doc = partnerDoc();
  await assert.rejects(abid.cancelAbidAirSupplierBooking(doc), (e) => e.status === 500);
  assert.equal(doc.supplierBookingStatus, "on hold");
});
