import axios from "axios";

const getTravelNetworkToken = () => {
    const token = process.env.Travel_Network_API_Token?.trim();
    if (!token) throw new Error("Travel Network API token is not configured");
    return token;
};

const getTravelNetworkBaseURL = () => {
    const url = process.env.Travel_Network_BaseURL?.trim();
    if (!url) throw new Error("Travel Network base URL is not configured");
    return url;
};

export const createTravelNetworkBooking = async (bookingData) => {
    const token = getTravelNetworkToken();
    const baseURL = getTravelNetworkBaseURL();

    const response = await axios.post(`${baseURL}/api/create/booking`, bookingData, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    return response.data;
};

const formatDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split("T")[0];
};

const normalizeTravelNetworkType = (value) => {
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
        "UK GROUP": "UK ONE WAY GROUP",
    };

    return typeMap[rawType] || rawType;
};

export const getTravelNetworkTypeFilters = (category) => {
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

const normalizeTravelNetworkGroup = (group, airlineMap = {}) => {
    const details = Array.isArray(group?.details) ? group.details : [];
    const deptDate = formatDate(group?.dept_date);

    const normalizedDetails = details.map((d) => {
        const depDate = formatDate(d?.flight_date) || deptDate;
        return {
            sr: d?.sr || null,
            flight_no: d?.flight_no || "",
            dep_date: depDate,
            flight_date: depDate,
            dept_time: d?.dept_time || "",
            origin: d?.origin || "",
            destination: d?.destination || "",
            arv_date: null,
            arv_time: d?.arv_time || "",
            // Baggage lives on the detail row; fall back to group-level
            baggage: d?.baggage || group?.baggage || "",
            meal: group?.meal || "",
            seats: Number(d?.seats) || 0,
        };
    });

    // Prefer group.available_no_of_pax (the field the API explicitly provides).
    // Fall back to the min of detail-level seats for APIs that use that pattern.
    const detailSeatValues = normalizedDetails.map((d) => d.seats).filter((s) => s > 0);
    const detailMinSeats = detailSeatValues.length > 0 ? Math.min(...detailSeatValues) : 0;
    const availablePax =
        group?.available_no_of_pax !== undefined && group?.available_no_of_pax !== null
            ? Number(group.available_no_of_pax)
            : detailMinSeats;

    const firstDetail = normalizedDetails[0] || null;

    // Airline: prefer embedded group.airline, then airlineMap, then empty
    const embeddedAirline = group?.airline || null;
    const airlineId = embeddedAirline?.id ?? group?.airline_id ?? null;
    const airlineMapInfo = airlineId !== null ? (airlineMap[String(airlineId)] || null) : null;
    const rawGroupPriceDetailId =
        group?.group_price_detail_id ??
        group?.groupPriceDetailId ??
        group?.price_detail_id ??
        group?.group_price_id ??
        null;

    return {
        id: String(group?.id || ""),
        source: "travel-network",
        isOwnGroup: false,
        groupName: null,
        sector:
            group?.sector ||
            (firstDetail?.origin && firstDetail?.destination
                ? `${firstDetail.origin}-${firstDetail.destination}`
                : ""),
        type: normalizeTravelNetworkType(group?.type),
        available_no_of_pax: availablePax,
        showSeat: true,
        price: Number(group?.price) || 0,
        childPrice: 0,
        infantPrice: 0,
        pnr: group?.pnr || "",
        dept_date: deptDate,
        arv_date: formatDate(group?.arv_date),
        group_price_detail_id: rawGroupPriceDetailId,
        details: normalizedDetails,
        airline: {
            id: airlineId,
            airline_name: embeddedAirline?.airline_name || airlineMapInfo?.airline_name || "",
            short_name: embeddedAirline?.short_name   || airlineMapInfo?.short_name   || null,
            logo_url:   embeddedAirline?.logo_url     || airlineMapInfo?.logo_url     || null,
        },
    };
};

const fetchTravelNetworkAirlineMap = async (token, baseURL) => {
    try {
        const response = await axios.get(`${baseURL}/api/available/airlines`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });
        const payload = response.data;
        const rawAirlines = Array.isArray(payload?.airlines)
            ? payload.airlines
            : Array.isArray(payload)
              ? payload
              : payload?.data || [];

        // Build a map keyed by id for O(1) lookup
        const map = {};
        for (const a of rawAirlines) {
            if (a?.id !== undefined && a?.id !== null) {
                map[String(a.id)] = {
                    airline_name: a.airline_name || "",
                    short_name: a.short_name || null,
                    logo_url: a.logo_url || null,
                };
            }
        }
        return map;
    } catch (err) {
        console.error("Travel Network airlines fetch failed:", err.message);
        return {};
    }
};

export const fetchNormalisedTravelNetworkGroups = async () => {
    const token = getTravelNetworkToken();
    const baseURL = getTravelNetworkBaseURL();

    // Fetch groups and airlines in parallel
    const [groupsResponse, airlineMap] = await Promise.all([
        axios.get(`${baseURL}/api/available/groups?type&airline_id&dept_date`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }),
        fetchTravelNetworkAirlineMap(token, baseURL),
    ]);

    const payload = groupsResponse.data;
    const rawGroups = Array.isArray(payload?.groups)
        ? payload.groups
        : Array.isArray(payload)
          ? payload
          : payload?.data || payload?.result || [];

    return rawGroups
        .map((g) => normalizeTravelNetworkGroup(g, airlineMap))
        .filter((group) => group.id);
};

export const getAvailableTravelNetworkGroups = async (req, res) => {
    try {
        const groups = await fetchNormalisedTravelNetworkGroups();
        const allowedTypes = getTravelNetworkTypeFilters(req.query.category);
        const filteredGroups = allowedTypes
            ? groups.filter((group) => allowedTypes.includes(group.type))
            : groups;

        res.status(200).json({
            success: true,
            data: filteredGroups,
        });
    } catch (error) {
        console.error("TRAVEL NETWORK API ERROR:", error.message || error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
