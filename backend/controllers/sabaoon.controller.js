import axios from "axios";
import FormData from "form-data";
import {
  getValidSabaoonToken,
  invalidateSabaoonToken,
} from "../utils/sabaoonToken.js";
import SabaoonGroupOverride from "../models/SabaoonGroupOverride.js";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/** Format a Date (or date string) to "YYYY-MM-DD". Returns "" if invalid. */
const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const getSabaoonBaseURL = () => {
  const baseURL =
    process.env.sabbor_Base_URI?.trim() ||
    process.env.saboor_Base_URI?.trim() ||
    process.env.SABAOON_API_URL?.trim();

  if (!baseURL) {
    throw new Error("Sabaoon/Saboor API base URL is not configured");
  }

  return baseURL.replace(/\/+$/, "");
};

const getConfiguredSabaoonAgentCode = () =>
  process.env.saboor_AgentCode?.trim() ||
  process.env.sabbor_AgentCode?.trim() ||
  process.env.SABAOON_AGENT_CODE?.trim() ||
  "";

// `agent_name` is a new field required by the updated Sabaoon booking API
// docs. Falls back to the generic agency name used by the other providers
// (Al-Haider, MCT) when no Sabaoon-specific override is set.
const getConfiguredSabaoonAgentName = () =>
  process.env.saboor_AgentName?.trim() ||
  process.env.sabbor_AgentName?.trim() ||
  process.env.SABAOON_AGENT_NAME?.trim() ||
  process.env.name?.trim() ||
  "";

const getSabaoonBookingEndpoint = () => {
  const path =
    process.env.saboor_Booking_Path?.trim() ||
    process.env.sabbor_Booking_Path?.trim() ||
    process.env.SABAOON_BOOKING_PATH?.trim() ||
    "/booking";

  return path.startsWith("/") ? path : `/${path}`;
};

const normalizeSabaoonType = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeSabaoonGroup = (group) => {
  const details = Array.isArray(group?.details) ? group.details : [];
  const deptDate = formatDate(
    group?.dept_date || group?.dep_date || details[0]?.flight_date,
  );
  const airlineObj = Array.isArray(group?.airline)
    ? group.airline[0]
    : group?.airline;
  const firstDetail = details[0] || {};
  const lastDetail = details[details.length - 1] || {};
  const LOGO_BASE = "https://alsaboorportal.com/assets/img/airline-logo/";

  const logoUrl = airlineObj?.logo_url
    ? airlineObj.logo_url.startsWith("http")
      ? airlineObj.logo_url
      : `${LOGO_BASE}${encodeURIComponent(airlineObj.logo_url)}`
    : null;

  // Sabaoon only sends the bare flight number (e.g. "801"), not the airline
  // code — prefix it with the airline's short_name (e.g. "SV") so it reads
  // "SV 801", matching how flight numbers are shown for the other providers.
  const airlineCode = String(airlineObj?.short_name || "").trim();

  const normalizedDetails = details.map((detail) => {
    const depDate = formatDate(
      detail?.flight_date || detail?.dep_date || deptDate,
    );
    const rawFlightNo = String(detail?.flight_no || "").trim();
    const flightNo =
      airlineCode &&
      rawFlightNo &&
      !rawFlightNo.toUpperCase().startsWith(airlineCode.toUpperCase())
        ? `${airlineCode} ${rawFlightNo}`
        : rawFlightNo;

    return {
      ...detail,
      sr: detail?.sr || null,
      flight_no: flightNo,
      dep_date: depDate,
      flight_date: depDate,
      origin: detail?.origin || "",
      destination: detail?.destination || "",
      baggage: detail?.baggage || group?.baggage || "",
      dept_time: detail?.dept_time || "",
      arv_time: detail?.arv_time || "",
      arv_date: formatDate(detail?.arv_date || detail?.arr_date),
      meal: group?.meal || detail?.meal || "",
    };
  });

  return {
    ...group,
    id: String(group?.id || group?.group_id || ""),
    source: "sabaoon",
    isOwnGroup: false,
    groupName: group?.groupName || group?.group_name || null,
    sector:
      firstDetail?.origin && firstDetail?.destination
        ? `${firstDetail.origin}-${firstDetail.destination}`
        : group?.sector || "",
    type: normalizeSabaoonType(group?.type),
    available_no_of_pax: Number(group?.available_no_of_pax || 0),
    showSeat: true,
    price: Number(group?.price || group?.adult_pkr || 0),
    childPrice: Number(group?.price_child || group?.child_pkr || 0),
    infantPrice: Number(group?.price_infants || group?.infant_pkr || 0),
    pnr: group?.pnr || "",
    dept_date: deptDate,
    arv_date: formatDate(group?.arv_date || lastDetail?.flight_date),
    group_price_detail_id: group?.group_price_detail_id ?? null,
    details: normalizedDetails,
    airline: airlineObj ? { ...airlineObj, logo_url: logoUrl } : null,
  };
};

// ─────────────────────────────────────────────────────────
// AXIOS INSTANCE WITH AUTO TOKEN REFRESH
// ─────────────────────────────────────────────────────────

const SABOOR = axios.create({ timeout: 30000 });

// The token is fetched fresh on every request; getValidSabaoonToken() only
// hits the login API when the cached token is missing/expired, otherwise
// it's a DB read.
SABOOR.interceptors.request.use(async (config) => {
  const { token } = await getValidSabaoonToken();

  config.baseURL = getSabaoonBaseURL();
  config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  config.params = { ...config.params, token };

  return config;
});

// Sabaoon responds with HTTP 200 even for its own error conditions (e.g.
// `{ status: 'error', message: 'Token not found' }` for an expired/unrecognized
// token), so retry once with a freshly issued token when we see that shape.
SABOOR.interceptors.response.use(async (response) => {
  const config = response.config;

  if (
    response.data?.status === "error" &&
    /token/i.test(response.data?.message || "") &&
    config &&
    !config._retriedAfterTokenRefresh
  ) {
    config._retriedAfterTokenRefresh = true;
    await invalidateSabaoonToken();
    return SABOOR(config);
  }

  return response;
});

// ─────────────────────────────────────────────────────────
// SHARED HELPER
// ─────────────────────────────────────────────────────────

/**
 * Fetches and normalises all available Sabaoon groups from the external API.
 * Throws on token or network failure.
 */
export const fetchNormalisedSabaoonGroups = async (type) => {
  const response = await SABOOR.get("/groups", {
    params: type ? { type } : undefined,
  });

  if (response.data?.status === "error") {
    throw new Error(
      response.data?.message || "Sabaoon groups API returned an error",
    );
  }

  const payload = response.data;
  const rawGroups = Array.isArray(payload)
    ? payload
    : payload?.groups || payload?.data || payload?.result || [];

  return rawGroups
    .map(normalizeSabaoonGroup)
    .filter((group) => group.id && group.available_no_of_pax > 0);
};

// ─────────────────────────────────────────────────────────
// GET ALL GROUPS (public / frontend)
// ─────────────────────────────────────────────────────────

export const getSabaoonGroups = async (req, res) => {
  try {
    const groups = await fetchNormalisedSabaoonGroups(req.query.type);

    // Load admin overrides and build a lookup map
    const overrides = await SabaoonGroupOverride.find({}).lean();
    const overrideMap = Object.fromEntries(
      overrides.map((o) => [String(o.groupId), o]),
    );

    // Filter out hidden groups; attach individualMargin when set
    const publicGroups = groups
      .filter((g) => !overrideMap[String(g.id)]?.isHidden)
      .map((g) => {
        const override = overrideMap[String(g.id)];
        return { ...g, individualMargin: override?.individualMargin ?? null };
      });

    return res.json({ success: true, data: publicGroups });
  } catch (error) {
    console.error("Error fetching Sabaoon groups:", error?.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch groups from Sabaoon" });
  }
};

// ─────────────────────────────────────────────────────────
// GET ALL GROUPS (admin — includes hidden + override data)
// ─────────────────────────────────────────────────────────

export const getAdminSabaoonGroups = async (req, res) => {
  try {
    const groups = await fetchNormalisedSabaoonGroups(req.query.type);

    const overrides = await SabaoonGroupOverride.find({}).lean();
    const overrideMap = Object.fromEntries(
      overrides.map((o) => [String(o.groupId), o]),
    );

    const adminGroups = groups.map((g) => {
      const override = overrideMap[String(g.id)];
      return {
        ...g,
        isHidden: override?.isHidden ?? false,
        individualMargin: override?.individualMargin ?? null,
      };
    });

    return res.json({ success: true, data: adminGroups });
  } catch (error) {
    console.error("Error fetching admin Sabaoon groups:", error?.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch groups from Sabaoon" });
  }
};

// ─────────────────────────────────────────────────────────
// UPSERT GROUP OVERRIDE (admin)
// ─────────────────────────────────────────────────────────

export const upsertGroupOverride = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { isHidden, individualMargin } = req.body;

    const update = {};
    if (isHidden !== undefined) update.isHidden = Boolean(isHidden);
    if (individualMargin !== undefined) {
      // empty string or explicit null clears the margin
      update.individualMargin =
        individualMargin === "" ||
        individualMargin === null ||
        individualMargin == 0
          ? null
          : Number(individualMargin);
    }

    const override = await SabaoonGroupOverride.findOneAndUpdate(
      { groupId: String(groupId) },
      { $set: update },
      { upsert: true, new: true },
    );

    return res.json({ success: true, data: override });
  } catch (error) {
    console.error("Error upserting group override:", error?.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update group override" });
  }
};

// ─────────────────────────────────────────────────────────
// CREATE BOOKING ON SABAOON
// ─────────────────────────────────────────────────────────

/**
 * Sends a booking to the Sabaoon API.
 *
 * @param {object} params
 * @param {string}   params.groupId          Sabaoon's numeric group_id
 * @param {string}   params.pnr              PNR string (may contain " / " for two PNRs)
 * @param {string}   params.bookingReference Our internal booking reference (used as roe)
 * @param {number}   params.adultsCount
 * @param {number}   params.childrenCount
 * @param {number}   params.infantsCount
 * @param {object[]} params.passengers       Passenger objects from our Booking model
 * @param {object}   params.pricing          Pricing object from our Booking model
 *
 * @returns {{ transactionId: number }} Sabaoon transaction_id
 */
const buildSabaoonBookingForm = ({
  token,
  groupId,
  pnr,
  bookingReference,
  adultsCount,
  childrenCount,
  infantsCount,
  passengers,
  pricing,
}) => {
  // Split PNR into pnr_1 / pnr_2 (Sabaoon sometimes has "PNR1 / PNR2")
  const pnrParts = (pnr || "").split(/\s*\/\s*/);
  const pnr_1 = pnrParts[0] || "";
  const pnr_2 = pnrParts[1] || "";

  const totalSeats = adultsCount + childrenCount; // Sabaoon counts infants differently

  // Build form-data body (Sabaoon backend is PHP and expects multipart/form-data,
  // matching the same format used by the login endpoint).
  const form = new FormData();

  form.append("token", token);
  form.append("agent_id", getConfiguredSabaoonAgentCode());
  form.append("agent_name", getConfiguredSabaoonAgentName());
  form.append("roe", bookingReference);
  form.append("no_of_seat", String(totalSeats));
  form.append("group_id", String(groupId));
  form.append("pnr_1", pnr_1);
  form.append("pnr_2", pnr_2);
  // Explicit passenger type counts so Sabaoon tallies correctly
  form.append("api_adults", String(adultsCount));
  form.append("api_childs", String(childrenCount));
  form.append("api_infants", String(infantsCount));

  // Sabaoon expects numeric human_type: 1=adult, 2=child, 3=infant
  const humanTypeMap = { adult: "1", child: "2", infant: "3" };

  for (const p of passengers) {
    form.append("pax_title[]", p.title || "Mr");
    form.append(
      "human_type[]",
      humanTypeMap[(p.type || "Adult").toLowerCase()] || "1",
    );
    form.append("sur_name[]", p.surName || "");
    form.append("given_name[]", p.givenName || "");
    form.append("pass_no[]", p.passport || "");
    form.append("dob[]", formatDate(p.dateOfBirth));
    form.append("doi[]", ""); // passport issue date not collected
    form.append("doe[]", formatDate(p.passportExpiry));
  }

  // Price arrays — one entry per passenger of that type.
  // Always send the original base price to Sabaoon (before any margin markup).
  // Fall back to adultPrice if base prices are not stored (legacy bookings).
  const sabaoonAdultPrice = pricing.adultBasePrice || pricing.adultPrice || 0;
  const sabaoonChildPrice = pricing.childBasePrice || pricing.childPrice || 0;
  const sabaoonInfantPrice =
    pricing.infantBasePrice || pricing.infantPrice || 0;

  for (let i = 0; i < adultsCount; i++)
    form.append("adult_price[]", String(sabaoonAdultPrice));
  for (let i = 0; i < childrenCount; i++)
    form.append("child_price[]", String(sabaoonChildPrice));
  for (let i = 0; i < infantsCount; i++)
    form.append("infant_price[]", String(sabaoonInfantPrice));

  return form;
};

export const createSabaoonBooking = async (bookingParams) => {
  // The form-data body is a stream and can't be replayed, so on a token
  // error we invalidate the cached token and rebuild the form from scratch
  // with a freshly issued one, instead of retrying the same request config.
  const submit = async (isRetry) => {
    const { token } = await getValidSabaoonToken();

    if (!token) {
      throw new Error("No valid Sabaoon token available");
    }

    console.log(
      `[Sabaoon] Creating booking with token: ${token.slice(0, 8)}...${isRetry ? " (retry)" : ""}`,
    );

    const form = buildSabaoonBookingForm({ ...bookingParams, token });

    const response = await axios.post(
      `${getSabaoonBaseURL()}${getSabaoonBookingEndpoint()}`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Token ${token}`,
        },
      },
    );

    console.log("[Sabaoon] Booking response:", JSON.stringify(response.data));

    const { status, message, transaction_id, booking_id, id } = response.data;

    if (status && String(status).toLowerCase() !== "success") {
      if (!isRetry && /token/i.test(message || "")) {
        await invalidateSabaoonToken();
        return submit(true);
      }
      throw new Error(
        message || "Sabaoon booking API returned a failure status",
      );
    }

    return { transactionId: transaction_id ?? booking_id ?? id ?? null };
  };

  return submit(false);
};
