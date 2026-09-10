import axios from "axios";

// Read at call time (lazy) so .env is always loaded before first use.
// NOTE: the v2 docs list paths like "/group-booking/book" against the base
// URL, but the live API actually serves them under "/api/group-booking/..."
// (confirmed against the sandbox — the undocumented paths 404). Base URL
// should therefore be just the host, e.g. https://flight-search-api.on-forge.com
const getConfig = () => ({
  baseURL: process.env.GROUP_BOOKING_BASE_URL,
  apiToken: process.env.GROUP_BOOKING_API_TOKEN,
});

const GroupBookingAPI = axios.create({
  timeout: 30000,
  headers: { Accept: "application/json" },
});

// Inject baseURL + static Bearer token on every request
GroupBookingAPI.interceptors.request.use((config) => {
  const { baseURL, apiToken } = getConfig();
  config.baseURL = baseURL;
  config.headers.Authorization = `Bearer ${apiToken}`;
  return config;
});

GroupBookingAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(
        "Group Booking API Error:",
        error.response.status,
        error.config?.method?.toUpperCase(),
        `${error.config?.baseURL || ""}${error.config?.url || ""}`,
        error.response.data,
      );
      const enhancedError = new Error(
        error.response.data?.message || "Group Booking API request failed",
      );
      enhancedError.groupBookingResponseData = error.response.data;
      enhancedError.groupBookingStatusCode = error.response.status;
      throw enhancedError;
    } else if (error.request) {
      console.error("Group Booking API No Response:", error.request);
      throw new Error("No response from Group Booking API");
    } else {
      console.error("Group Booking API Error:", error.message);
      throw new Error(error.message);
    }
  },
);

/**
 * Search available group flights.
 * All params are optional — called with {} to list everything for the
 * unified groups screen, or with real search params from a user search.
 */
export const searchGroupBookings = async (params = {}) => {
  try {
    const res = await GroupBookingAPI.post(
      "/api/group-booking/get-available-bookings",
      params,
    );
    return res.data?.data || [];
  } catch (error) {
    console.error("Error fetching Group Booking availability:", error.message);
    return [];
  }
};

// ─── Booking ────────────────────────────────────────────────────────────

const GROUP_BOOKING_PAX_TYPE = { Adult: "ADT", Child: "CHD", Infant: "INF" };

// Confirmed against the sandbox: title must be one of these exact words
// (not codes like "MR") — "Passenger title must be one of: Mr, Mrs, Ms, Miss, Master."
const GROUP_BOOKING_TITLES = ["Mr", "Mrs", "Ms", "Miss", "Master"];

const resolveGroupBookingTitle = (type, existingTitle) => {
  if (type === "Child" || type === "Infant") return "Master";
  const normalized = String(existingTitle || "").trim().toLowerCase();
  const match = GROUP_BOOKING_TITLES.find((t) => t.toLowerCase() === normalized);
  return match || "Mr";
};

const formatDateForGroupBooking = (dateValue) => {
  if (!dateValue) return null;
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue))
    return dateValue;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Build the /group-booking/book request body.
 * searchId/offerId come from the flight card the agent picked in search
 * results (search_id + id on that card).
 */
export const formatGroupBookingPayload = ({
  searchId,
  offerId,
  contact,
  passengers = [],
}) => ({
  search_id: searchId,
  offer_id: offerId,
  contact: {
    email: contact?.email || "",
    phone: contact?.phone || "",
  },
  passengers: passengers.map((p) => {
    const passportNo = p.passport || p.passport_no || p.passportNo || "";
    const passportExpiry = formatDateForGroupBooking(
      p.passportExpiry || p.expiry || p.doe,
    );

    const entry = {
      type: GROUP_BOOKING_PAX_TYPE[p.type] || "ADT",
      title: resolveGroupBookingTitle(p.type, p.title),
      first_name: p.givenName || p.given_name || p.first_name || "",
      last_name: p.surName || p.surname || p.last_name || "",
      dob: formatDateForGroupBooking(p.dateOfBirth || p.dob),
    };

    // Optional — and must be unique across passengers when provided, so
    // only send it when we actually have a value.
    if (passportNo) entry.passport_no = passportNo;
    if (passportExpiry) entry.passport_expiry = passportExpiry;

    return entry;
  }),
});

export const bookGroupBooking = async (data) => {
  const res = await GroupBookingAPI.post("/api/group-booking/book", data);
  return res.data?.data || res.data;
};

/**
 * Push an On-Hold group booking forward for admin review/approval.
 */
export const requestGroupBooking = async (groupTransactionId) => {
  const res = await GroupBookingAPI.post(
    `/api/group-booking/${groupTransactionId}/request`,
  );
  return res.data?.data || res.data;
};

/**
 * Fetch full detail of a booked group (status, PNR, ticket numbers, etc).
 */
export const getGroupBookingDetail = async (groupTransactionId) => {
  const res = await GroupBookingAPI.get(
    `/api/group-booking/${groupTransactionId}`,
  );
  return res.data?.data || res.data;
};

export default GroupBookingAPI;
