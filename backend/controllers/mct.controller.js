import axios from "axios";

// ─── MCT (mcttravels.com) API client ───────────────────────────────────────
// Mirrors the shape of the other provider controllers (Al-Haider, Sabaoon,
// Travel Network, Abid Air): config read lazily from env, a shared axios
// instance with auth + error normalization, normalisers for the unified
// group listing, and a booking formatter/creator for the checkout flow.

const MCT_ENDPOINTS = {
  groups: "/api/available/groups",
  sectors: "/api/available/sectors",
  airlines: "/api/available/airlines",
  groupDetail: (groupId) => `/api/group/detail/${groupId}`,
  groupSeats: (groupId) => `/api/group/seats/${groupId}`,
  createBooking: "/api/create/booking",
  showBooking: (bookingId) => `/api/show/booking/${bookingId}`,
};

const getMCTConfig = () => ({
  baseURL: process.env.MCT_API_URL?.trim(),
  token: process.env.MCT_API_TOKEN?.trim(),
});

// MCT returns asset paths (airline logos, etc.) as bare relative paths like
// "airlines/1761067815.png" rather than full URLs — resolve them against the
// site's public storage root (https://mcttravels.com/storage/<path>).
const getMCTStorageURL = (assetPath) => {
  if (!assetPath) return null;

  const trimmedPath = String(assetPath).trim();
  if (!trimmedPath) return null;
  if (/^https?:\/\//i.test(trimmedPath)) return trimmedPath;

  const { baseURL } = getMCTConfig();
  const root = (baseURL || "https://mcttravels.com").replace(/\/+$/, "");

  return `${root}/storage/${trimmedPath.replace(/^\/+/, "")}`;
};

const MCT = axios.create({
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

MCT.interceptors.request.use((config) => {
  const { baseURL, token } = getMCTConfig();

  config.baseURL = baseURL?.replace(/\/+$/, "");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

MCT.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("MCT API Error:", error.response.data);

      const enhancedError = new Error(
        error.response.data?.message || "MCT API request failed",
      );
      enhancedError.mctResponseData = error.response.data;
      enhancedError.mctStatusCode = error.response.status;
      throw enhancedError;
    }

    if (error.request) {
      console.error("MCT API No Response:", error.request);
      throw new Error("No response from MCT API");
    }

    console.error("MCT API Error:", error.message);
    throw new Error(error.message);
  },
);

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toNullableCount = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = toNumber(value);
  return number > 0 ? number : null;
};

const formatMCTDate = (dateValue) => {
  if (!dateValue) return "";
  if (typeof dateValue === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    return dateValue.slice(0, 10);
  }

  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};

const getMCTPassengerTitle = (type, title) => {
  const normalizedTitle = String(title || "")
    .toUpperCase()
    .trim();
  const validTitles = ["MR", "MRS", "MS", "CHD", "INF"];

  if (validTitles.includes(normalizedTitle)) return normalizedTitle;
  if (type === "Child") return "CHD";
  if (type === "Infant") return "INF";

  return "MR";
};

// MCT only accepts these three exact strings for booking_details.type.
const getMCTPassengerType = (type, title) => {
  const validTypes = ["Adult", "Child", "Infant"];
  if (validTypes.includes(type)) return type;

  const normalizedTitle = String(title || "")
    .toUpperCase()
    .trim();
  if (normalizedTitle === "CHD") return "Child";
  if (normalizedTitle === "INF") return "Infant";

  return "Adult";
};

// MCT's group-details API gives each leg a dept_time/arv_time but no
// per-leg arrival date — only the overall journey's dept_date/arv_date on the
// group itself (which can even be null). Assume each leg lands the same day
// it departs, unless its arrival time is earlier than its departure time
// (arrival past midnight), in which case it lands the next day.
const deriveMCTLegArrivalDate = (depDate, deptTime, arvTime) => {
  if (!depDate) return null;
  if (deptTime && arvTime && arvTime < deptTime) {
    const date = new Date(`${depDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().split("T")[0];
  }
  return depDate;
};

const normalizeMCTDetails = (group) =>
  (group.details || []).map((detail, index) => {
    const depDate = detail.flight_date || group.dept_date || "";

    return {
      id: detail.id || null,
      group_id: detail.group_id || group.id || null,
      sr: toNumber(detail.sr, index + 1),
      flight_no: detail.flight_no || "",
      dep_date: depDate,
      flight_date: depDate,
      dept_time: detail.dept_time || "",
      origin: detail.origin || "",
      destination: detail.destination || "",
      arv_date:
        deriveMCTLegArrivalDate(depDate, detail.dept_time, detail.arv_time) ||
        group.arv_date ||
        null,
      arv_time: detail.arv_time || "",
      baggage: detail.baggage || group.baggage || "",
      meal: group.meal || "",
      bookedSeats: 0,
    };
  });

export const normalizeMCTGroup = (group = {}, index = 0) => {
  const availableSeats = toNumber(group.available_no_of_pax);
  const airlineName = group.airline?.airline_name || "";

  return {
    id: String(group.id ?? `mct_${Date.now()}_${index}`),
    source: "mct",
    isOwnGroup: false,
    sector: group.sector || "",
    sectorKey: group.sector || "",
    type: group.type || "",
    available_no_of_pax: availableSeats,
    available_package_seats: toNumber(group.available_package_seats),
    showSeat: true,
    _totalOriginalSeats: availableSeats,
    _onHoldSeats: 0,
    _activeBookings: 0,
    price: toNumber(group.price),
    sale_price: toNumber(group.sale_price || group.price),
    childPrice: 0,
    infantPrice: 0,
    baggage: group.baggage || "",
    meal: group.meal || "",
    pnr: group.pnr || "",
    dept_date: group.dept_date || null,
    arv_date: group.arv_date || null,
    details: normalizeMCTDetails(group),
    airline: {
      id: group.airline?.id || group.airline_id || null,
      airline_name: airlineName,
      short_name: group.airline?.short_name || airlineName.substring(0, 2),
      path_type: group.airline?.path_type || null,
      logo_path: group.airline?.logo_path || null,
      logo_url: getMCTStorageURL(
        group.airline?.logo_url || group.airline?.logo_path,
      ),
    },
    user: null,
    bookedSeats: 0,
  };
};

export const getMCTGroups = async (params = {}) => {
  try {
    const response = await MCT.get(MCT_ENDPOINTS.groups, {
      params: {
        type: 0,
        airline_id: 0,
        ...params,
      },
    });

    return response.data?.groups || [];
  } catch (error) {
    console.error("Error fetching groups from MCT:", error.message);
    return [];
  }
};

export const fetchNormalisedMCTGroups = async (params = {}) => {
  const groups = await getMCTGroups(params);
  return groups.map((group, index) => normalizeMCTGroup(group, index));
};

export const getMCTSectors = async (params = {}) => {
  try {
    const response = await MCT.get(MCT_ENDPOINTS.sectors, { params });
    return response.data?.sectors || [];
  } catch (error) {
    console.error("Error fetching sectors from MCT:", error.message);
    return [];
  }
};

export const getMCTAirlines = async () => {
  try {
    const response = await MCT.get(MCT_ENDPOINTS.airlines);
    return response.data?.airlines || [];
  } catch (error) {
    console.error("Error fetching airlines from MCT:", error.message);
    return [];
  }
};

export const getMCTGroupDetail = async (groupId) => {
  const response = await MCT.get(MCT_ENDPOINTS.groupDetail(groupId));
  return response.data?.group || response.data;
};

export const getMCTGroupSeats = async (groupId) => {
  try {
    const response = await MCT.get(MCT_ENDPOINTS.groupSeats(groupId));
    const seats = response.data?.seats ?? response.data?.available_no_of_pax;

    return {
      group_id: String(response.data?.group_id || groupId),
      seats: toNumber(seats),
    };
  } catch (error) {
    if (error.mctStatusCode && error.mctStatusCode !== 404) {
      throw error;
    }

    const group = await getMCTGroupDetail(groupId);

    return {
      group_id: String(group?.id || groupId),
      seats: toNumber(group?.available_no_of_pax),
    };
  }
};

export const checkMCTSeats = async (groupId, requestedSeats = 0) => {
  const seatInfo = await getMCTGroupSeats(groupId);
  const requested = toNumber(requestedSeats);

  return {
    ...seatInfo,
    requested_seats: requested,
    available: seatInfo.seats >= requested,
  };
};

export const formatBookingForMCT = ({
  groupId,
  agencyInfo = {},
  passengers = [],
  pricing = {},
}) => {
  const adults =
    agencyInfo.adults ??
    pricing.adults ??
    passengers.filter((p) => p.type === "Adult").length;
  const child =
    agencyInfo.child ??
    agencyInfo.children ??
    pricing.child ??
    pricing.children ??
    passengers.filter((p) => p.type === "Child").length;
  const infant =
    agencyInfo.infant ??
    pricing.infant ??
    pricing.infants ??
    passengers.filter((p) => p.type === "Infant").length;

  return {
    group_id: Number(groupId),
    agency_info: {
      group_id: Number(groupId),
      agent_name:
        agencyInfo.agent_name || agencyInfo.agentName || agencyInfo.name || "",
      agency_name:
        agencyInfo.agency_name ||
        agencyInfo.agencyName ||
        agencyInfo.companyName ||
        "",
      email: agencyInfo.email || "",
      mobile: agencyInfo.mobile || agencyInfo.phone || "",
      adults: toNumber(adults),
      child: toNullableCount(child),
      infant: toNullableCount(infant),
      agent_notes:
        agencyInfo.agent_notes ||
        agencyInfo.agentNotes ||
        agencyInfo.notes ||
        null,
    },
    booking_details: passengers.map((passenger) => ({
      type: getMCTPassengerType(passenger.type, passenger.title),
      surname: passenger.surname || passenger.surName || "",
      given_name:
        passenger.given_name ||
        passenger.givenName ||
        passenger.firstName ||
        "",
      title: getMCTPassengerTitle(passenger.type, passenger.title),
      passport_no:
        passenger.passport_no ||
        passenger.passportNo ||
        passenger.passport ||
        "",
      dob: formatMCTDate(passenger.dob || passenger.dateOfBirth),
      doe: formatMCTDate(passenger.doe || passenger.passportExpiry),
    })),
  };
};

export const createMCTBooking = async (bookingData) => {
  const response = await MCT.post(MCT_ENDPOINTS.createBooking, bookingData);
  return response.data;
};

export const getMCTBooking = async (bookingId) => {
  const response = await MCT.get(MCT_ENDPOINTS.showBooking(bookingId));
  return response.data;
};

// ─── Express handlers ──────────────────────────────────────────────────────

export const getAvailableMCTBookingsByGroup = async (req, res) => {
  try {
    const groups = await fetchNormalisedMCTGroups();
    res.status(200).json({ success: true, data: groups });
  } catch (error) {
    console.error("MCT API ERROR:", error.message || error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const checkMCTGroupSeats = async (req, res) => {
  try {
    const requiredSeats = Number(req.query.requiredSeats);
    if (!Number.isInteger(requiredSeats) || requiredSeats < 0) {
      return res.status(400).json({
        success: false,
        message: "requiredSeats must be a non-negative whole number.",
      });
    }

    const seatInfo = await checkMCTSeats(req.params.groupId, requiredSeats);

    return res.status(seatInfo.available ? 200 : 409).json({
      success: seatInfo.available,
      available: seatInfo.available,
      requiredSeats,
      remainingSeats: seatInfo.seats,
      message: seatInfo.available
        ? "Seats are available."
        : `Seats not available. You requested ${requiredSeats} seat(s), but only ${seatInfo.seats} remain.`,
    });
  } catch (error) {
    console.error("MCT AVAILABILITY ERROR:", error.message || error);
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to check seat availability.",
    });
  }
};

export default MCT;
