import axios from "axios";
import {
  fetchNormalisedTravelNetworkGroups,
  getTravelNetworkTypeFilters,
} from "./travel-network.controller.js";
import {
  fetchNormalisedAbidAirGroups,
  getAbidAirTypeFilters,
} from "./abidair.controller.js";

/**
 * Create a booking on Al-Haider API
 */
export const createAlHaiderBooking = async (bookingData) => {
  const token = getAlHaiderToken();
  const baseURL = process.env.ALI_HAIDER_API_URL?.replace(/\/+$/, "");

  const response = await axios.post(
    `${baseURL}/api/create/booking`,
    bookingData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
};

const getAlHaiderToken = () => {
  const token = process.env.ALI_HAIDER_API_TOKEN?.trim();

  if (!token) {
    throw new Error("Al-Haider API token is not configured");
  }

  return token;
};

const getAlHaiderBaseURL = () => {
  const baseURL = process.env.ALI_HAIDER_API_URL?.trim();

  if (!baseURL) {
    throw new Error("Al-Haider API URL is not configured");
  }

  return baseURL.replace(/\/+$/, "");
};

const formatDate = (value) => {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().split("T")[0];
};

const normalizeAlHaiderType = (value) => {
  const rawType = String(value || "")
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const typeMap = {
    UAE: "UAE ONE WAY GROUP",
    "UAE ONEWAY": "UAE ONE WAY GROUP",
    "UAE ONE WAY": "UAE ONE WAY GROUP",

    KSA: "ONE WAY GROUP",
    "KSA ONEWAY": "ONE WAY GROUP",
    "KSA ONE WAY": "ONE WAY GROUP",
    SAUDI: "ONE WAY GROUP",
    "SAUDI ARABIA": "ONE WAY GROUP",

    OMAN: "OMAN ONE WAY GROUP",
    "OMAN ONEWAY": "OMAN ONE WAY GROUP",
    "OMAN ONE WAY": "OMAN ONE WAY GROUP",
    MUSCAT: "OMAN ONE WAY GROUP",
    MASCAT: "OMAN ONE WAY GROUP",

    UMRAH: "UMRAH GROUP",

    UK: "UK ONE WAY GROUP",
    "UK ONEWAY": "UK ONE WAY GROUP",
    "UK ONE WAY": "UK ONE WAY GROUP",
    "UNITED KINGDOM": "UK ONE WAY GROUP",
    LONDON: "UK ONE WAY GROUP",
  };

  return typeMap[rawType] || rawType;
};

const getAlHaiderTypeFilters = (category) => {
  const key = String(category || "all")
    .toLowerCase()
    .trim();

  const filters = {
    all: null,
    uae: ["UAE ONE WAY GROUP"],
    ksa: ["ONE WAY GROUP"],
    muscat: ["OMAN ONE WAY GROUP"],
    umrah: ["UMRAH GROUP"],
    uk: ["UK ONE WAY GROUP"],
  };

  return filters[key] ?? null;
};

const normalizeFlightDetail = (detail, fallbackDepDate = null) => {
  const depDate = formatDate(
    detail?.dep_date ||
      detail?.flight_date ||
      detail?.departure_date ||
      detail?.date ||
      fallbackDepDate,
  );

  return {
    sr: detail?.sr || detail?.serial || detail?.sequence || null,
    flight_no:
      detail?.flight_no || detail?.flightNo || detail?.flight_number || "",
    dep_date: depDate,
    flight_date: depDate,
    dept_time:
      detail?.dept_time || detail?.dep_time || detail?.departure_time || "",
    origin:
      detail?.origin ||
      detail?.from ||
      detail?.from_city ||
      detail?.fromTerminal ||
      "",
    destination:
      detail?.destination ||
      detail?.to ||
      detail?.to_city ||
      detail?.toTerminal ||
      "",
    arv_date: formatDate(
      detail?.arv_date ||
        detail?.arr_date ||
        detail?.arrival_date ||
        detail?.date_arrival,
    ),
    arv_time:
      detail?.arv_time || detail?.arr_time || detail?.arrival_time || "",
    baggage: detail?.baggage || detail?.baggage_allowance || "",
    meal: detail?.meal || detail?.meals || "",
  };
};

const normalizeAlHaiderGroup = (group) => {
  const detailsSource = Array.isArray(group?.details)
    ? group.details
    : Array.isArray(group?.flights)
      ? group.flights
      : [];

  const deptDate = formatDate(
    group?.dept_date ||
      group?.dep_date ||
      group?.departure_date ||
      detailsSource[0]?.dep_date,
  );

  const normalizedDetails = detailsSource.map((detail) =>
    normalizeFlightDetail(detail, deptDate),
  );

  const firstDetail = normalizedDetails[0] || null;
  const lastDetail = normalizedDetails[normalizedDetails.length - 1] || null;

  const airlineName =
    group?.airline?.airline_name ||
    group?.airline_name ||
    group?.airlineName ||
    group?.airline ||
    "";

  return {
    id: String(group?.id || group?.group_id || group?.groupId || ""),
    source: "al-haider",
    isOwnGroup: false,

    groupName: group?.groupName || group?.group_name || null,

    sector:
      group?.sector ||
      group?.route ||
      group?.sector_name ||
      (firstDetail?.origin && firstDetail?.destination
        ? `${firstDetail.origin}-${firstDetail.destination}`
        : ""),

    type: normalizeAlHaiderType(
      group?.type || group?.groupType || group?.group_type,
    ),

    available_no_of_pax: Number(
      group?.available_no_of_pax ||
        group?.availableSeats ||
        group?.no_of_seat ||
        0,
    ),

    showSeat: group?.showSeat ?? true,

    price: Number(group?.price || group?.adult_price || group?.adultPrice || 0),
    childPrice: Number(group?.childPrice || group?.child_price || 0),
    infantPrice: Number(group?.infantPrice || group?.infant_price || 0),

    pnr: group?.pnr || group?.pnr_1 || "",

    dept_date: deptDate,
    arv_date: formatDate(
      group?.arv_date ||
        group?.arr_date ||
        group?.arrival_date ||
        lastDetail?.arv_date,
    ),

    details: normalizedDetails,

    airline: {
      id: group?.airline?.id || group?.airline_id || null,
      airline_name: airlineName,
      short_name:
        group?.airline?.short_name ||
        group?.airline?.shortCode ||
        group?.airline_short_name ||
        null,
      logo_url:
        group?.airline?.logo_url ||
        group?.airline_logo ||
        group?.logo_url ||
        null,
    },
  };
};

export const fetchNormalisedAlHaiderGroups = async () => {
  const token = getAlHaiderToken();
  const baseURL = getAlHaiderBaseURL();

  const response = await axios.get(
    `${baseURL}/api/available/groups?type=0&airline_id=0`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const payload = response.data;

  const rawGroups = Array.isArray(payload)
    ? payload
    : payload?.data || payload?.groups || payload?.result || [];

  return rawGroups
    .map(normalizeAlHaiderGroup)
    .filter((group) => group.id && group.available_no_of_pax > 0);
};

export const getAvailableBookingsByGroup = async (req, res) => {
  try {
    const category = req.query.category;

    const allowedAlHaiderTypes = getAlHaiderTypeFilters(category);
    const allowedTNTypes = getTravelNetworkTypeFilters(category);
    const allowedAbidTypes = getAbidAirTypeFilters(category);

    const [alHaiderResult, travelNetworkResult, abidAirResult] =
      await Promise.allSettled([
        fetchNormalisedAlHaiderGroups(),
        fetchNormalisedTravelNetworkGroups(),
        fetchNormalisedAbidAirGroups(),
      ]);

    const alHaiderData =
      alHaiderResult.status === "fulfilled" ? alHaiderResult.value : [];

    const travelNetworkData =
      travelNetworkResult.status === "fulfilled"
        ? travelNetworkResult.value
        : [];

    const abidAirData =
      abidAirResult.status === "fulfilled" ? abidAirResult.value : [];

    if (alHaiderResult.status === "rejected") {
      console.error(
        "AL-HAIDER FETCH FAILED:",
        alHaiderResult.reason?.response?.data || alHaiderResult.reason?.message,
      );
    }

    if (travelNetworkResult.status === "rejected") {
      console.error(
        "TRAVEL NETWORK FETCH FAILED:",
        travelNetworkResult.reason?.response?.data ||
          travelNetworkResult.reason?.message,
      );
    }

    if (abidAirResult.status === "rejected") {
      console.error(
        "FETCH FAILED:",
        abidAirResult.reason?.response?.data || abidAirResult.reason?.message,
      );
    }

    const filteredAlHaider = allowedAlHaiderTypes
      ? alHaiderData.filter((g) => allowedAlHaiderTypes.includes(g.type))
      : alHaiderData;

    const filteredTravelNetwork = allowedTNTypes
      ? travelNetworkData.filter((g) => allowedTNTypes.includes(g.type))
      : travelNetworkData;

    const filteredAbidAir = allowedAbidTypes
      ? abidAirData.filter((g) => allowedAbidTypes.includes(g.type))
      : abidAirData;

    const combined = [
      ...filteredAlHaider,
      ...filteredTravelNetwork,
      ...filteredAbidAir,
    ];

    return res.status(200).json({
      success: true,
      total: combined.length,
      sources: {
        alHaider: filteredAlHaider.length,
        travelNetwork: filteredTravelNetwork.length,
        abidAir: filteredAbidAir.length,
      },
      data: combined,
    });
  } catch (error) {
    console.error("API GROUPS ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message,
    });
  }
};

export const getAirlines = async (req, res) => {
  try {
    const token = getAlHaiderToken();
    const baseURL = getAlHaiderBaseURL();

    const response = await axios.get(`${baseURL}/api/available/airlines`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    return res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error(
      "AL-HAIDER AIRLINES API ERROR:",
      error.response?.data || error.message,
    );

    return res.status(400).json({
      success: false,
      message: error.response?.data?.message || error.message,
    });
  }
};
