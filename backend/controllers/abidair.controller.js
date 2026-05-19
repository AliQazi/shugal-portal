import axios from "axios";

const getAbidAirBaseURL = () => {
  return (
    process.env.ABIDAIRTRAVEL_BASE_URI?.trim() ||
    process.env.ABIDAIRTRAVEL_BASEURL?.trim() ||
    process.env.abidairtravel_BaseURI?.trim() ||
    process.env.ABIDAIRTRAVEL_BASEURI?.trim()
  );
};

const getAbidAirToken = () => {
  const token =
    process.env.ABIDAIRTRAVEL_TOKEN?.trim() ||
    process.env.abidairtravel_Token?.trim();

  if (!token) {
    throw new Error("AbidAir travel API token is not configured");
  }

  return token;
};

export const getAbidAirTypeFilters = (category) => {
  const key = String(category || "all").toLowerCase().trim();

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

const parseDateValue = (value) => {
  if (!value) return null;

  const dateString = String(value).trim();
  const exactMatch = dateString.match(/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/);
  if (exactMatch) {
    const day = Number(exactMatch[1]);
    const monthName = exactMatch[2].slice(0, 3).toLowerCase();
    const year = Number(exactMatch[3]);
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = monthNames.indexOf(monthName);
    if (month >= 0 && !Number.isNaN(day) && !Number.isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  const parsed = new Date(dateString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value) => {
  const parsed = parseDateValue(value);
  if (!parsed) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime = (value) => {
  if (!value) return "";
  return String(value).slice(0, 5);
};

const normalizeMeal = (value) => {
  const meal = String(value || "").trim();
  if (!meal) return "No";
  const normalized = meal.toUpperCase();
  if (["NO", "NIL", "EXCLUDED", "NOT INCLUDED", "NO MEAL"].includes(normalized)) {
    return "No";
  }
  return meal;
};

const normalizeAbidAirType = (value, group = {}) => {
  const rawType = String(value || group?.type || group?.category || group?.package_type || "")
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!rawType) {
    const route = String(group?.sector || group?.route || group?.from || group?.origin || group?.destination || "").toUpperCase();
    if (/UMRAH|MAKKAH|MADINA|HARAM|MED|JED|KSA|SAUDI/.test(route)) {
      return "UMRAH GROUP";
    }
    return "UMRAH GROUP";
  }
if (/UMRAH|MAKKAH|MADINA|HARAM/.test(rawType)) return "UMRAH GROUP";
if (/UAE/.test(rawType)) return "UAE ONE WAY GROUP";
if (/KSA/.test(rawType)) return "ONE WAY GROUP";
if (/UK/.test(rawType)) return "UK ONE WAY GROUP";

  return rawType;
};

const normalizeFlightDetail = (detail, fallbackDepDate = null) => {
  const depDate = formatDate(
    detail?.dep_date || detail?.flight_date || detail?.departure_date || detail?.date || fallbackDepDate,
  );

  return {
    sr: detail?.sr || detail?.serial || detail?.sequence || null,
    flight_no: detail?.flight_no || detail?.flightNo || detail?.flight_number || detail?.flightNumber || "",
    dep_date: depDate,
    flight_date: depDate,
    dept_time: detail?.dept_time || detail?.departure_time || detail?.departure_time || detail?.dep_time || "",
    origin: detail?.origin || detail?.from || detail?.departure_city || "",
    destination: detail?.destination || detail?.to || detail?.arrival_city || "",
    arv_date: formatDate(detail?.arv_date || detail?.arr_date || detail?.arrival_date || detail?.date_arrival),
    arv_time: detail?.arv_time || detail?.arrival_time || detail?.arr_time || "",
    baggage: detail?.baggage || detail?.baggage_allowance || "",
    meal: detail?.meal || detail?.meals || "",
  };
};

const normalizeAbidAirGroup = (group) => {
  const payload = group?.flight || group;
  const fd = payload?.flight_details || payload?.flightDetails || payload?.flight_detail || {};
  const route = payload?.route || {};
  const time = payload?.time || {};

  const id = String(group?.package_id || group?.id || group?.packageId || group?.PackageId || payload?.id || "");
  const depDate = formatDate(time?.departure?.date);
  const arvDate = formatDate(time?.arrival?.date);

  const sector = fd?.sector || route?.sector || "";

  const [sectorOrigin, sectorDestination] = sector.includes("-")
    ? sector.split("-").map((v) => v.trim())
    : ["", ""];

  // Prefer code-like values from sector (ISB-DMM) so frontend stays consistent.
  const origin = sectorOrigin || route?.origin || "";
  const destination = sectorDestination || route?.destination || "";

  const returnRoute = route?.return || {};
  const returnTime = time?.return || {};
  const isReturn = Number(route?.is_return || 0) === 1 || !!route?.return || !!time?.return;

  const details = [
    {
      sr: 1,
      flight_no: fd?.flight_number || "",
      dep_date: depDate,
      flight_date: depDate,
      dept_time: formatTime(time?.departure?.time),
      origin,
      destination,
      arv_date: arvDate,
      arv_time: formatTime(time?.arrival?.time),
      baggage: fd?.baggage || route?.baggage || "",
      meal: normalizeMeal(fd?.meal),
    },
  ];

  if (isReturn) {
    const returnSector = String(returnRoute?.sector || "");
    const [returnOriginFromSector, returnDestinationFromSector] = returnSector.includes("-")
      ? returnSector.split("-").map((v) => v.trim())
      : ["", ""];

    const returnDepDate = formatDate(returnTime?.departure?.date || returnTime?.date);
    const returnArvDate = formatDate(returnTime?.arrival?.date || returnTime?.arr_date);

    details.push({
      sr: 2,
      flight_no: returnRoute?.flight_number || returnRoute?.flightNo || "",
      dep_date: returnDepDate,
      flight_date: returnDepDate,
      dept_time: formatTime(returnTime?.departure?.time || returnTime?.dep_time),
      origin: returnOriginFromSector || returnRoute?.origin || destination,
      destination: returnDestinationFromSector || returnRoute?.destination || origin,
      arv_date: returnArvDate,
      arv_time: formatTime(returnTime?.arrival?.time || returnTime?.arr_time),
      baggage: returnRoute?.baggage || route?.return_baggage || fd?.baggage || "",
      meal: normalizeMeal(returnRoute?.meal || route?.return_meal || fd?.meal),
    });
  }

  return {
    id,
    packageId: id,
    source: "abidairtravel",
    isOwnGroup: false,

    groupName: String(group?.package_name || payload?.package_name || fd?.type || group?.groupName || "") || null,
    packageName: String(group?.package_name || payload?.package_name || fd?.type || group?.groupName || "") || null,
    hotels: group?.hotels || payload?.hotels || null,
    rates: group?.rates || payload?.rates || null,

    sector:
      sector ||
      (origin && destination ? `${origin}-${destination}` : ""),

    type: normalizeAbidAirType(fd?.type, group),

    available_no_of_pax: Number(
      group?.available_no_of_pax ||
        fd?.available_no_of_pax ||
        fd?.availableSeats ||
        fd?.available_seats ||
        group?.availableSeats ||
        group?.seats ||
        group?.available_seats ||
        1
    ),

    showSeat: true,

    price: Number(group?.rates?.sharing || fd?.sale_price || 0),
    flightPrice: Number(fd?.sale_price || 0),
    childPrice: Number(group?.rates?.child_without_bed || 0),
    infantPrice: Number(group?.rates?.infant || 0),

    pnr: fd?.pnr || "",

    dept_date: depDate,
    arv_date: arvDate,

    details,

    airline: {
      id: null,
      airline_name: fd?.airline || "",
      short_name: fd?.airline || null,
      logo_url: null,
    },
  };
};

export const fetchNormalisedAbidAirGroups = async () => {
  const baseURL = getAbidAirBaseURL();
  const token = getAbidAirToken();

  if (!baseURL) {
    throw new Error("AbidAir base URL is not configured");
  }

  const cleanBaseURL = baseURL.replace(/\/+$/, "");
  const candidates = [`${cleanBaseURL}/flight/active`, `${cleanBaseURL}/packages/active`];
  if (!/\/api$/i.test(cleanBaseURL)) {
    candidates.push(`${cleanBaseURL}/api/packages/active`);
  }

  const rawGroupArrays = [];
  let lastError = null;

  await Promise.allSettled(
    candidates.map((url) =>
      axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
    )
  ).then((results) => {
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        const response = result.value;
        const resultData = response.data;
        const rawGroups = Array.isArray(resultData)
          ? resultData
          : resultData?.data ||
            resultData?.flights ||
            resultData?.groups ||
            resultData?.result ||
            resultData?.items || [];

        if (Array.isArray(rawGroups) && rawGroups.length > 0) {
          rawGroupArrays.push(...rawGroups);
        }
      } else {
        lastError = result.reason || lastError;
      }
    });
  });

  if (rawGroupArrays.length === 0) {
    if (lastError) {
      throw lastError;
    }
    return [];
  }

  const normalizedGroups = rawGroupArrays
    .map(normalizeAbidAirGroup)
    .filter((group) => group.id);

  const uniqueGroups = Array.from(
    new Map(normalizedGroups.map((group) => [group.id, group])).values()
  );

  return uniqueGroups;
};
export const getAvailableAbidAirBookingsByGroup = async (req, res) => {
  try {
    const groups = await fetchNormalisedAbidAirGroups();
    res.status(200).json({ success: true, data: groups });
  } catch (error) {
    console.error("ABID AIR API ERROR:", error.message || error);
    res.status(400).json({ success: false, message: error.message });
  }
};
