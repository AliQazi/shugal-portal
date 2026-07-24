import axios from "axios";
import GroupBookingToken from "../models/GroupBookingToken.js";

// Read at call time (lazy) so .env is always loaded before first use
const getConfig = () => ({
  productBaseURL: process.env.GROUP_BOOKING_PRODUCT_ENDPOINT,
  authURL: process.env.GROUP_BOOKING_AUTH_URL,
  clientId: process.env.GROUP_BOOKING_CLIENT_ID,
  username: process.env.GROUP_BOOKING_USERNAME,
  password: process.env.GROUP_BOOKING_PASSWORD,
  agencyCode: process.env.GROUP_BOOKING_AGENCY_CODE,
});

// The accessToken exchange endpoint lives on the same Cognito auth host/stage
// as signin, under .../auth/cognito/custom/user/token/get/accessToken —
// derive it from GROUP_BOOKING_AUTH_URL instead of needing a separate env var.
const getAccessTokenExchangeURL = (authURL) =>
  authURL.replace(
    /\/client\/user\/signin\/initiate\/?$/,
    "/custom/user/token/get/accessToken",
  );

// Fast in-process cache so we don't hit the DB on every single API call.
// The DB (GroupBookingToken) is the source of truth and survives restarts /
// is shared across processes.
let memoryCache = { idToken: null, accessToken: null, expiresAt: 0 };
let inFlightAuth = null; // dedupe concurrent auth calls within this process

const persistToken = async ({ idToken, accessToken, expiresAt }) => {
  await GroupBookingToken.deleteMany({});
  await GroupBookingToken.create({ idToken, accessToken, expiresAt });
};

/**
 * Two-step auth: Cognito USER_PASSWORD_AUTH signin, then exchange the
 * Cognito access token for the id_token/access_token pair the product API expects.
 * Persists the result to DB so it survives restarts and is shared across processes.
 */
const authenticate = async () => {
  const { authURL, clientId, username, password } = getConfig();

  console.log("[GROUP BOOKING] Authenticating via", authURL);
  const initiateRes = await axios.post(authURL, {
    clientId,
    authFlow: "USER_PASSWORD_AUTH",
    authParameters: { USERNAME: username, PASSWORD: password },
  });

  const cognitoAccessToken =
    initiateRes.data?.data?.authenticationResult?.accessToken;
  if (!cognitoAccessToken) {
    throw new Error(
      "Group Booking: signin initiate did not return an access token",
    );
  }

  const exchangeURL = getAccessTokenExchangeURL(authURL);
  console.log("[GROUP BOOKING] Exchanging token via", exchangeURL);
  const exchangeRes = await axios.post(exchangeURL, {
    accessToken: cognitoAccessToken,
    clientId,
  });

  const { id_token, access_token, expires_in } = exchangeRes.data?.data || {};
  if (!access_token) {
    throw new Error(
      "Group Booking: token exchange did not return an access_token",
    );
  }

  const ttlMs = (Number(expires_in) || 3600) * 1000;
  const expiresAt = new Date(Date.now() + ttlMs - 60000); // refresh 60s early

  memoryCache = {
    idToken: id_token,
    accessToken: access_token,
    expiresAt: expiresAt.getTime(),
  };

  await persistToken({ idToken: id_token, accessToken: access_token, expiresAt });

  console.log(
    "[GROUP BOOKING] Token refreshed, valid until",
    expiresAt.toISOString(),
  );

  return memoryCache;
};

const getValidToken = async () => {
  const now = Date.now();

  if (memoryCache.accessToken && now < memoryCache.expiresAt) {
    return memoryCache;
  }

  // Another process/request may have already refreshed it — check DB before
  // spending a fresh Cognito auth round trip.
  const stored = await GroupBookingToken.findOne().sort({ createdAt: -1 });
  if (
    stored?.accessToken &&
    stored.expiresAt &&
    new Date(stored.expiresAt).getTime() > now
  ) {
    memoryCache = {
      idToken: stored.idToken,
      accessToken: stored.accessToken,
      expiresAt: new Date(stored.expiresAt).getTime(),
    };
    return memoryCache;
  }

  if (!inFlightAuth) {
    inFlightAuth = authenticate().finally(() => {
      inFlightAuth = null;
    });
  }
  return inFlightAuth;
};

const GroupBookingAPI = axios.create({
  timeout: 30000,
  headers: { Accept: "application/json" },
});

// Inject baseURL + fresh Authorization: Bearer token on every request
GroupBookingAPI.interceptors.request.use(async (config) => {
  const { productBaseURL } = getConfig();
  config.baseURL = productBaseURL;
  const { accessToken } = await getValidToken();
  config.headers.Authorization = `Bearer ${accessToken}`;
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
 * Fetch the list of available group products
 */
export const getGroupBookingProducts = async () => {
  try {
    const res = await GroupBookingAPI.post("/product/availList", {
      pageIndex: 0,
      pageSize: 50,
      filter: {},
      sortColumns: [],
    });
    return res.data?.data?.list || [];
  } catch (error) {
    console.error("Error fetching Group Booking availList:", error.message);
    return [];
  }
};

// ─── Booking (NCT) ────────────────────────────────────────────────────────

const NCT_PAX_TYPE_MAP = { Adult: "ADT", Child: "CHD", Infant: "INF" };

const getTitleForNCT = (type, existingTitle) => {
  if (type === "Child") return "Mstr";
  if (type === "Infant") return "Mr";

  const titleMap = { MR: "Mr", MRS: "Mrs", MS: "Ms", CHD: "Mstr", INF: "Mr" };
  if (existingTitle) {
    const normalized = titleMap[existingTitle.toUpperCase().trim()];
    if (normalized) return normalized;
  }
  return "Mr";
};

const formatDateForNCT = (dateValue) => {
  if (!dateValue) return null;
  if (typeof dateValue === "string" && dateValue.match(/^\d{4}-\d{2}-\d{2}$/))
    return dateValue;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// NCT expects a 2-letter ISO nationality code (e.g. "PK"); our passenger data
// may already carry a code, or a full country name — normalize either form.
const NCT_NATIONALITY_MAP = {
  pakistan: "PK",
  "united arab emirates": "AE",
  "saudi arabia": "SA",
  "united kingdom": "GB",
  "united states": "US",
  india: "IN",
  bangladesh: "BD",
  afghanistan: "AF",
  iran: "IR",
  oman: "OM",
  kuwait: "KW",
  qatar: "QA",
  bahrain: "BH",
};

const normalizeNationalityForNCT = (nationality) => {
  if (!nationality) return "PK";
  const trimmed = String(nationality).trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return (
    NCT_NATIONALITY_MAP[trimmed.toLowerCase()] ||
    trimmed.slice(0, 2).toUpperCase()
  );
};

/**
 * Format booking data for the NCT /book endpoint
 */
export const formatBookingForNCT = ({
  productId,
  sealed,
  agencyCode,
  agencyName,
  bookStatus = "ON_HOLD",
  passengers = [],
  pricing = {},
}) => {
  const adtCount = passengers.filter((p) => p.type === "Adult").length;
  const chdCount = passengers.filter((p) => p.type === "Child").length;
  const infCount = passengers.filter((p) => p.type === "Infant").length;

  return {
    adtTotalNumber: adtCount,
    chdTotalNumber: chdCount,
    infTotalNumber: infCount,
    adtTotalFare: pricing.adultTotal ?? 0,
    chdTotalFare: chdCount ? (pricing.childTotal ?? 0) : null,
    infTotalFare: infCount ? (pricing.infantTotal ?? 0) : null,
    productId: String(productId),
    sealed: sealed ?? null,
    totalFare: pricing.grandTotal ?? 0,
    agencyCode,
    bookStatus,
    agencyName,
    paxList: passengers.map((p) => ({
      birthDate: formatDateForNCT(p.dateOfBirth),
      passportExpiry: formatDateForNCT(p.passportExpiry),
      passportIssueDate: formatDateForNCT(p.passportIssue),
      paxType: NCT_PAX_TYPE_MAP[p.type] || "ADT",
      name: p.givenName || "",
      lastName: p.surName || "",
      title: getTitleForNCT(p.type, p.title),
      passportNumber: p.passport || "",
      nationality: normalizeNationalityForNCT(p.nationality),
    })),
  };
};

export const bookGroupNCT = async (data) => {
  try {
    const res = await GroupBookingAPI.post("/book", data);
    return res.data;
  } catch (error) {
    console.error("NCT Book group ticket error:", error.message);
    throw error;
  }
};

export default GroupBookingAPI;
