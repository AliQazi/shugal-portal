import axios from "axios";

/**
 * Abid Air Partner API v1 client (https://abidairtravels.com/api/external/v1).
 *
 * Server-side only. Inventory is fetched live; bookings are handed to Abid Air
 * using the availability-token flow, and Abid Air prices its own inventory.
 *
 * Shaheen Wings already labels Abid Air inventory with the source key
 * "abidairtravel" (bookings, margin rules, ledger, admin/agent UI), so that key
 * is kept — only the transport underneath changed.
 */
export const ABID_AIR_SOURCE = "abidairtravel";
export const ABID_AIR_SUPPLIER_NAME = "Abid Air International";

const DEFAULT_BASE_URL = "https://abidairtravels.com/api/external/v1";
const DEFAULT_TIMEOUT = 30000;

/** Partner mode is on only when an API key is configured; otherwise the
 *  legacy Abid Air integration keeps working untouched. */
export const isAbidAirPartnerConfigured = () =>
  Boolean(process.env.ABID_AIR_API_KEY?.trim());

const getClient = () => {
  const apiKey = process.env.ABID_AIR_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error("Abid Air API is not configured");
    error.status = 503;
    error.code = "ABID_AIR_NOT_CONFIGURED";
    throw error;
  }

  return axios.create({
    baseURL: (process.env.ABID_AIR_API_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    timeout: Number(process.env.ABID_AIR_API_TIMEOUT) || DEFAULT_TIMEOUT,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });
};

const getHeader = (headers, names) => {
  for (const name of names) {
    const value = headers?.[name] ?? headers?.[name.toLowerCase()];
    if (value !== undefined) return value;
  }
  return null;
};

// Keeps status / code / Retry-After / request ids for the caller. Never logs
// the API key, request bodies or passenger data.
const makeAbidAirError = (error, endpoint) => {
  const response = error.response;
  const responseData = response?.data;
  const supplierError = responseData?.error;
  const enhancedError = new Error(
    supplierError?.message ||
      responseData?.message ||
      error.message ||
      "Abid Air API request failed",
  );

  enhancedError.name = "AbidAirApiError";
  enhancedError.status = response?.status || (error.request ? 502 : 500);
  enhancedError.code =
    supplierError?.code ||
    responseData?.code ||
    (error.request ? "ABID_AIR_NO_RESPONSE" : "ABID_AIR_REQUEST_FAILED");
  enhancedError.retryAfter = getHeader(response?.headers, ["retry-after"]);
  enhancedError.requestId = getHeader(response?.headers, ["x-request-id", "request-id"]);
  enhancedError.correlationId = getHeader(response?.headers, ["x-correlation-id", "correlation-id"]);
  enhancedError.endpoint = endpoint;
  enhancedError.details = supplierError?.details || null;
  enhancedError.responseData = responseData || null;

  console.error("Abid Air API error", {
    endpoint,
    status: enhancedError.status,
    code: enhancedError.code,
    requestId: enhancedError.requestId,
    correlationId: enhancedError.correlationId,
  });

  return enhancedError;
};

const request = async (method, endpoint, { params, data, headers } = {}) => {
  try {
    return await getClient().request({ method, url: endpoint, params, data, headers });
  } catch (error) {
    if (error.code === "ABID_AIR_NOT_CONFIGURED") throw error;
    throw makeAbidAirError(error, endpoint);
  }
};

const fetchAllPages = async (endpoint, params = {}) => {
  const limit = params.limit || 100;
  const first = await request("get", endpoint, {
    params: { ...params, page: params.page || 1, limit },
  });
  const firstData = first.data?.data || [];
  const pages = Number(first.data?.meta?.pages) || 1;

  if (params.page || pages <= 1) return firstData;

  const remaining = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) =>
      request("get", endpoint, { params: { ...params, page: index + 2, limit } }).then(
        (response) => response.data?.data || [],
      ),
    ),
  );

  return [firstData, ...remaining].flat();
};

export const getGroupTicketing = (params = {}) => fetchAllPages("/group-ticketing", params);

export const getGroupTicketingById = async (id) => {
  const response = await request("get", `/group-ticketing/${encodeURIComponent(id)}`);
  return response.data?.data;
};

export const getUmrahPackages = (params = {}) => fetchAllPages("/umrah-packages", params);

export const getUmrahPackageById = async (id) => {
  const response = await request("get", `/umrah-packages/${encodeURIComponent(id)}`);
  return response.data?.data;
};

export const checkAvailability = async ({ inventoryId, adults, children, infants }) => {
  const response = await request("post", "/availability", {
    data: {
      inventoryId: String(inventoryId),
      adults: Number(adults) || 0,
      children: Number(children) || 0,
      infants: Number(infants) || 0,
    },
  });
  const data = response.data?.data || response.data;
  const token =
    data?.availabilityToken ||
    data?.token ||
    getHeader(response.headers, ["x-availability-token"]);

  if (data?.available === false) {
    const error = new Error(
      `Not enough availability (requested ${data.requestedUnits}, available ${data.availableUnits}).`,
    );
    error.name = "AbidAirApiError";
    error.status = 409;
    error.code = "INSUFFICIENT_INVENTORY";
    throw error;
  }

  if (!token) {
    const error = new Error("Abid Air did not return an availability token");
    error.name = "AbidAirApiError";
    error.status = 502;
    error.code = "ABID_AIR_TOKEN_MISSING";
    throw error;
  }

  return { ...data, token };
};

export const createBooking = async (payload, availabilityToken) => {
  if (!availabilityToken) {
    const error = new Error("Abid Air availability token is required");
    error.name = "AbidAirApiError";
    error.status = 400;
    error.code = "ABID_AIR_TOKEN_REQUIRED";
    throw error;
  }

  const response = await request("post", "/bookings", {
    data: payload,
    headers: { "X-Availability-Token": availabilityToken },
  });
  return response.data?.data;
};

export const getBookingById = async (bookingId) => {
  const response = await request("get", `/bookings/${encodeURIComponent(bookingId)}`);
  return response.data?.data;
};

export const cancelBooking = async (bookingId) => {
  const response = await request("post", `/bookings/${encodeURIComponent(bookingId)}/cancel`);
  return response.data?.data;
};

export const getAbidAirHttpStatus = (error) => {
  // 401/403 mean OUR Abid Air key/scope is wrong, not that the agent is logged
  // out — never surface them as auth errors to the agent (the code is kept).
  if ([400, 404, 409, 422, 428, 429].includes(error?.status)) return error.status;
  if ([401, 403].includes(error?.status)) return 502;
  if (error?.status >= 500) return 502;
  return error?.status || 500;
};

/* ───────────────────────── passengers ───────────────────────── */

export const toIsoDate = (value) => {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const normalizedType = (type) => {
  const t = String(type || "Adult").toLowerCase();
  if (t.startsWith("child")) return "Child";
  if (t.startsWith("infant")) return "Infant";
  return "Adult";
};

const normalizedTitle = (passenger, type) => {
  const title = String(passenger.title || "").toUpperCase();
  if (type === "Child") return "CHD";
  if (type === "Infant") return "INF";
  return ["MR", "MRS", "MS"].includes(title) ? title : "MR";
};

export const formatAbidAirPassengers = (passengers, { isUmrah = false } = {}) => {
  if (!Array.isArray(passengers) || passengers.length === 0) {
    const error = new Error("At least one passenger is required for Abid Air");
    error.name = "AbidAirApiError";
    error.status = 422;
    error.code = "ABID_AIR_PASSENGERS_REQUIRED";
    throw error;
  }

  return passengers.map((passenger, index) => {
    const type = normalizedType(passenger.type);
    const mapped = {
      type,
      title: normalizedTitle(passenger, type),
      givenName: String(passenger.givenName || passenger.givenname || passenger.given_name || "").trim(),
      surName: String(passenger.surName || passenger.surname || "").trim(),
      passport: String(passenger.passport || passenger.passportNo || passenger.passport_no || "").trim(),
      nationality: String(passenger.nationality || "Pakistan").trim(),
      dateOfBirth: toIsoDate(passenger.dateOfBirth || passenger.dob),
      passportIssue: toIsoDate(passenger.passportIssue),
      passportExpiry: toIsoDate(passenger.passportExpiry || passenger.expiry || passenger.doe),
    };

    if (isUmrah && type === "Child") {
      mapped.childType = ["withBed", "withoutBed"].includes(passenger.childType)
        ? passenger.childType
        : "withoutBed";
    }

    const missing = ["givenName", "surName", "passport", "nationality"].filter((f) => !mapped[f]);
    if (isUmrah) {
      ["dateOfBirth", "passportExpiry"].forEach((f) => !mapped[f] && missing.push(f));
    }
    if ((passenger.dateOfBirth || passenger.dob) && !mapped.dateOfBirth) missing.push("valid dateOfBirth");
    if (passenger.passportIssue && !mapped.passportIssue) missing.push("valid passportIssue");
    if ((passenger.passportExpiry || passenger.expiry || passenger.doe) && !mapped.passportExpiry) {
      missing.push("valid passportExpiry");
    }

    if (missing.length) {
      const unique = [...new Set(missing)];
      const error = new Error(
        `Passenger ${index + 1} is missing or has invalid Abid Air fields: ${unique.join(", ")}`,
      );
      error.name = "AbidAirApiError";
      error.status = 422;
      error.code = "ABID_AIR_PASSENGER_VALIDATION";
      error.fields = unique;
      throw error;
    }

    return Object.fromEntries(Object.entries(mapped).filter(([, v]) => v !== null && v !== ""));
  });
};

/** Partner roomType is sharing | quad | triple | double. Shaheen forms send a
 *  name ("double") or an occupancy number (2/3/4). */
export const toAbidAirRoomType = (value) => {
  const raw = String(value ?? "").toLowerCase().trim();
  const byName = { sharing: "sharing", shared: "sharing", quad: "quad", triple: "triple", double: "double" };
  if (byName[raw]) return byName[raw];
  const byCount = { 2: "double", 3: "triple", 4: "quad" };
  if (byCount[Number(raw)]) return byCount[Number(raw)];

  const error = new Error(`Abid Air does not support room type "${value}". Use sharing, quad, triple or double.`);
  error.name = "AbidAirApiError";
  error.status = 422;
  error.code = "ABID_AIR_ROOM_TYPE";
  throw error;
};

/* ───────────────────────── normalizers ───────────────────────── */

// Abid Air group types -> the type vocabulary Shaheen already uses for
// external providers (see TYPE_TO_CATEGORY in admin/agent UIs).
const GROUP_TYPE_MAP = {
  "UAE GROUPS": "UAE ONE WAY GROUP",
  "KSA GROUPS": "ONE WAY GROUP",
  "MASCAT GROUPS": "OMAN ONE WAY GROUP",
  "OMAN GROUPS": "OMAN ONE WAY GROUP",
  "UK GROUPS": "UK ONE WAY GROUP",
  "UMRAH GROUPS": "UMRAH GROUP",
};

export const mapAbidAirGroupType = (type) => {
  const key = String(type || "").toUpperCase().trim();
  return GROUP_TYPE_MAP[key] || key;
};

// The flight-number prefix is the IATA code ("G9-563" -> "G9"), which lets the
// agent UI resolve an airline logo when Abid Air sends none.
const airlineCodeFromFlights = (flights) => {
  const flightNo = flights?.[0]?.flightNo || flights?.[0]?.flight_no || "";
  const match = String(flightNo).match(/^([A-Z0-9]{2,3})[-\s]/i);
  return match ? match[1].toUpperCase() : "";
};

const normalizeFlight = (flight, index = 0) => {
  const dep = toIsoDate(flight.depDate || flight.flightDate || flight.flight_date);
  return {
    sr: Number(flight.sr) || index + 1,
    flight_no: flight.flightNo || flight.flight_no || "",
    dep_date: dep,
    flight_date: dep,
    dept_time: flight.depTime || flight.deptTime || flight.dept_time || "",
    origin: flight.origin || flight.sectorFrom || flight.from || "",
    destination: flight.destination || flight.sectorTo || flight.to || "",
    arv_date: toIsoDate(flight.arrDate || flight.arrivalDate || flight.arv_date),
    arv_time: flight.arrTime || flight.arrivalTime || flight.arv_time || "",
    baggage: flight.baggage || "",
    meal: flight.meal || "No",
    bookedSeats: 0,
  };
};

const sectorFromDetails = (details) => {
  const stops = [];
  details.forEach((d) => {
    const from = String(d.origin || "").trim().toUpperCase();
    const to = String(d.destination || "").trim().toUpperCase();
    if (from && stops[stops.length - 1] !== from) stops.push(from);
    if (to && stops[stops.length - 1] !== to) stops.push(to);
  });
  return stops.join("-");
};

const airlineFrom = (airline, flights) => ({
  id: null,
  airline_name: (typeof airline === "string" ? airline : airline?.name) || flights?.[0]?.airline || "",
  short_name:
    (typeof airline === "object" && (airline?.shortName || airline?.code)) ||
    airlineCodeFromFlights(flights) ||
    "",
  logo_url: typeof airline === "object" ? airline?.logo || null : null,
});

export const normalizeAbidAirGroup = (group) => {
  const details = (group.flights || []).map(normalizeFlight);
  const lastFlight = group.flights?.[group.flights.length - 1];

  return {
    id: String(group.id),
    externalId: String(group.id),
    groupCode: group.groupCode || "",
    groupName: group.name || null,
    source: ABID_AIR_SOURCE,
    partnerApi: true,
    abidAirBookingType: "flight",
    isOwnGroup: false,
    supplierName: ABID_AIR_SUPPLIER_NAME,

    sector: group.sector || sectorFromDetails(details),
    sectorKey: group.sector || sectorFromDetails(details),
    type: mapAbidAirGroupType(group.type),

    // Partner API reports real seat counts (the legacy API did not).
    available_no_of_pax: Number(group.availableSeats) || 0,
    showSeat: true,
    _totalOriginalSeats: Number(group.availableSeats) || 0,
    _onHoldSeats: 0,
    _activeBookings: 0,

    price: Number(group.fares?.adult) || 0,
    childPrice: Number(group.fares?.child) || 0,
    infantPrice: Number(group.fares?.infant) || 0,
    currency: group.currency || "PKR",

    pnr: group.pnr || "",
    dept_date: toIsoDate(group.flights?.[0]?.depDate || group.flights?.[0]?.flightDate),
    arv_date: toIsoDate(lastFlight?.arrDate || lastFlight?.arrivalDate),

    details,
    airline: airlineFrom(group.airline, group.flights),
    user: null,
    bookedSeats: 0,
  };
};

const hotelCity = (location) => {
  const value = String(location || "").toLowerCase();
  if (value.includes("madin") || value.includes("medin")) return "Madinah";
  if (value.includes("makk") || value.includes("mecca")) return "Makkah";
  return String(location || "");
};

/** Package shape the existing agent Umrah pages already understand
 *  (hotels[] with city, rates{}, flights[]/details[], package_name...). */
export const normalizeAbidAirPackage = (pkg) => {
  const totals = pkg.packageTotals || {};
  const details = (pkg.flights || []).map(normalizeFlight);
  const rates = {
    sharing: Number(totals.shared ?? totals.sharing) || 0,
    quad: Number(totals.quad) || 0,
    triple: Number(totals.triple) || 0,
    double: Number(totals.double) || 0,
    child_with_bed: Number(totals.childWithBed) || 0,
    child_without_bed: Number(totals.childWithoutBed) || 0,
    infant: Number(totals.infant) || 0,
  };
  const name = pkg.name || pkg.packageName || `Umrah Package ${pkg.id}`;

  return {
    id: String(pkg.id),
    package_id: String(pkg.id),
    packageId: String(pkg.id),
    externalId: String(pkg.id),
    package_name: name,
    packageName: name,
    groupName: name,
    source: ABID_AIR_SOURCE,
    partnerApi: true,
    abidAirBookingType: "package",
    isOwnGroup: false,
    supplierName: ABID_AIR_SUPPLIER_NAME,

    type: "UMRAH GROUP",
    sector: sectorFromDetails(details),
    packageDuration: Number(pkg.days) || 0,
    available_no_of_pax: Number(pkg.availableRooms) || 0,
    showSeat: true,

    rates,
    price: rates.sharing,
    childPrice: rates.child_without_bed,
    infantPrice: rates.infant,
    incentive: Number(totals.incentive) || 0,
    currency: "PKR",

    hotels: (pkg.hotels || []).map((hotel) => ({
      city: hotelCity(hotel.location),
      hotelName: hotel.name || "",
      rating: hotel.rating || 0,
      checkIn: hotel.checkIn || "",
      checkOut: hotel.checkOut || "",
      nights: hotel.nights || hotel.nightCount || 0,
    })),
    transports: pkg.transports || [],
    visa: pkg.visa || null,

    pnr: "",
    dept_date: details[0]?.dep_date || null,
    arv_date: details[details.length - 1]?.arv_date || null,
    details,
    flights: (pkg.flights || []).map((flight, index) => ({
      ...flight,
      flightNo: flight.flightNo || "",
      sectorFrom: flight.sectorFrom || details[index]?.origin || "",
      sectorTo: flight.sectorTo || details[index]?.destination || "",
      depDate: details[index]?.dep_date,
      arrDate: details[index]?.arv_date,
    })),
    airline: airlineFrom(pkg.airline, pkg.flights),
  };
};

export const fetchPartnerAbidAirInventory = async () => {
  const [groups, packages] = await Promise.allSettled([getGroupTicketing(), getUmrahPackages()]);

  if (groups.status === "rejected" && packages.status === "rejected") throw groups.reason;

  return [
    ...(groups.status === "fulfilled" ? groups.value.map(normalizeAbidAirGroup) : []),
    ...(packages.status === "fulfilled" ? packages.value.map(normalizeAbidAirPackage) : []),
  ];
};

/* ───────────────────────── booking handoff ───────────────────────── */

const abidAirError = (message, status, code) => {
  const error = new Error(message);
  error.name = "AbidAirApiError";
  error.status = status;
  error.code = code;
  return error;
};

/**
 * Phase 1 (before anything is written locally): confirm the item is still
 * bookable, validate passenger fields and obtain the 5-minute availability
 * token. Throws an AbidAirApiError on any problem.
 */
export const prepareAbidAirHandoff = async ({
  inventoryId,
  isPackage,
  adults,
  children,
  infants,
  passengers,
  roomType,
}) => {
  // Validate locally first — a bad passenger should cost no API call.
  const mappedPassengers = formatAbidAirPassengers(passengers, { isUmrah: isPackage });
  const resolvedRoomType = isPackage ? toAbidAirRoomType(roomType) : undefined;

  const inventory = isPackage
    ? await getUmrahPackageById(inventoryId)
    : await getGroupTicketingById(inventoryId);
  if (!inventory) throw abidAirError("Abid Air inventory is no longer available", 404, "INVENTORY_NOT_FOUND");

  const availability = await checkAvailability({
    inventoryId: inventory.id || inventoryId,
    adults,
    children,
    infants,
  });

  return {
    inventoryId: String(inventory.id || inventoryId),
    availabilityToken: availability.token,
    passengers: mappedPassengers,
    ...(isPackage && { roomType: resolvedRoomType }),
  };
};

/**
 * Phase 2: create the supplier booking. Returns the fields to persist on the
 * local booking. On 429/5xx the outcome is unknown, so the caller must keep
 * the local record as `supplier_pending` instead of retrying blindly.
 */
export const sendAbidAirHandoff = async (handoff, { contactPersonName, expectedBaseTotal }) => {
  const supplierResponse = await createBooking(
    {
      inventoryId: handoff.inventoryId,
      contactPersonName: contactPersonName || "N/A",
      ...(handoff.roomType && { roomType: handoff.roomType }),
      passengers: handoff.passengers,
    },
    handoff.availabilityToken,
  );

  if (!supplierResponse?._id) {
    throw abidAirError("Abid Air booking response did not include a booking ID", 502, "ABID_AIR_BOOKING_ID_MISSING");
  }

  const supplierTotal = Number(
    supplierResponse.pricing?.grandTotal ?? supplierResponse.pricing?.totalPrice,
  );

  return {
    supplierName: ABID_AIR_SUPPLIER_NAME,
    supplierBookingId: String(supplierResponse._id),
    supplierBookingStatus: supplierResponse.status || "on hold",
    supplierBookingData: supplierResponse,
    supplierBookingCreatedAt: new Date(),
    supplierPricing: supplierResponse.pricing || null,
    // Supplier price is authoritative; flag (never block) any difference from
    // what the agent was quoted at base price so support can reconcile.
    supplierPriceMismatch:
      Number.isFinite(supplierTotal) &&
      Number.isFinite(expectedBaseTotal) &&
      Math.abs(supplierTotal - expectedBaseTotal) > 0.01,
    supplierError: null,
    expiresAt: supplierResponse.expiresAt ? new Date(supplierResponse.expiresAt) : null,
  };
};

export const abidAirSafeError = (error) => ({
  status: error.status,
  code: error.code,
  message: error.message,
  retryAfter: error.retryAfter || null,
  requestId: error.requestId || null,
  correlationId: error.correlationId || null,
});

// 429 / 5xx: Abid Air may or may not have created the booking.
export const isUncertainAbidAirOutcome = (error) =>
  error?.status === 429 || error?.status >= 500;

export const abidAirErrorBody = (error) => ({
  success: false,
  message: error.message,
  code: error.code,
  retryAfter: error.retryAfter || undefined,
  requestId: error.requestId || undefined,
  correlationId: error.correlationId || undefined,
  fields: error.fields || undefined,
});

/* ───────────────────────── cancellation ───────────────────────── */

const isOnHold = (status) => ["on hold", "on_hold"].includes(String(status || "").toLowerCase());
const isCancelled = (status) => ["cancelled", "canceled"].includes(String(status || "").toLowerCase());

/** True for bookings created through the Partner API (legacy Abid Air bookings
 *  carry no supplierName and have no supplier-side cancel API). */
export const isPartnerAbidAirBooking = (doc) => doc?.supplierName === ABID_AIR_SUPPLIER_NAME;

/**
 * Cancel the supplier side of a booking (Booking or UmrahPackageBooking — both
 * carry the same supplier* fields). Mutates the doc but does not save it.
 * Throws when the supplier state does not allow a local cancellation.
 */
export const cancelAbidAirSupplierBooking = async (doc) => {
  if (!isPartnerAbidAirBooking(doc)) return { skipped: true };

  if (!doc.supplierBookingId || doc.supplierBookingStatus === "supplier_pending") {
    throw abidAirError(
      "Abid Air booking must be reconciled before it can be cancelled locally",
      409,
      "ABID_AIR_RECONCILIATION_REQUIRED",
    );
  }

  if (isCancelled(doc.supplierBookingStatus)) return { skipped: true };

  if (!isOnHold(doc.supplierBookingStatus)) {
    throw abidAirError(
      `Abid Air booking cannot be cancelled while supplier status is "${doc.supplierBookingStatus}"`,
      409,
      "ABID_AIR_INVALID_CANCELLATION_STATE",
    );
  }

  const cancellation = await cancelBooking(doc.supplierBookingId);
  doc.supplierBookingStatus = cancellation?.status || "cancelled";
  doc.supplierBookingData = { ...(doc.supplierBookingData || {}), cancellation };
  return { cancelled: true };
};
