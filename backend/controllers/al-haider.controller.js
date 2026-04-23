import axios from "axios";

const getAlHaiderToken = () => {
    const token = process.env.ALI_HAIDER_API_TOKEN?.trim();

    if (!token) {
        throw new Error("Al-Haider API token is not configured");
    }

    return token;
};

const formatDate = (value) => {
    if (!value) return null;

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split("T")[0];
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
    };

    return typeMap[rawType] || rawType;
};

const getAlHaiderTypeFilters = (category) => {
    const key = String(category || "all").toLowerCase().trim();

    const filters = {
        all: null,
        uae: ["UAE ONE WAY GROUP"],
        ksa: ["ONE WAY GROUP"],
        muscat: ["OMAN ONE WAY GROUP"],
        umrah: ["UMRAH GROUP"],
    };

    return filters[key] ?? null;
};

const normalizeFlightDetail = (detail, fallbackDepDate = null) => {
    const depDate = formatDate(
        detail?.dep_date || detail?.flight_date || detail?.departure_date || detail?.date || fallbackDepDate,
    );

    return {
        sr: detail?.sr || detail?.serial || detail?.sequence || null,
        flight_no: detail?.flight_no || detail?.flightNo || detail?.flight_number || "",
        dep_date: depDate,
        flight_date: depDate,
        dept_time: detail?.dept_time || detail?.dep_time || detail?.departure_time || "",
        origin: detail?.origin || detail?.from || detail?.from_city || detail?.fromTerminal || "",
        destination:
            detail?.destination || detail?.to || detail?.to_city || detail?.toTerminal || "",
        arv_date: formatDate(
            detail?.arv_date || detail?.arr_date || detail?.arrival_date || detail?.date_arrival,
        ),
        arv_time: detail?.arv_time || detail?.arr_time || detail?.arrival_time || "",
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
        group?.dept_date || group?.dep_date || group?.departure_date || detailsSource[0]?.dep_date,
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
        type: normalizeAlHaiderType(group?.type || group?.groupType || group?.group_type),
        available_no_of_pax: Number(
            group?.available_no_of_pax || group?.availableSeats || group?.no_of_seat || 0,
        ),
        showSeat: group?.showSeat ?? true,
        price: Number(group?.price || group?.adult_price || group?.adultPrice || 0),
        childPrice: Number(group?.childPrice || group?.child_price || 0),
        infantPrice: Number(group?.infantPrice || group?.infant_price || 0),
        pnr: group?.pnr || group?.pnr_1 || "",
        dept_date: deptDate,
        arv_date: formatDate(
            group?.arv_date || group?.arr_date || group?.arrival_date || lastDetail?.arv_date,
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
            logo_url: group?.airline?.logo_url || group?.airline_logo || group?.logo_url || null,
        },
    };
};

export const fetchNormalisedAlHaiderGroups = async () => {
    const token = getAlHaiderToken();

    const response = await axios.get(
        `${process.env.ALI_HAIDER_API_URL}api/available/groups?type=0&airline_id=0`,
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
        const groups = await fetchNormalisedAlHaiderGroups();
        const allowedTypes = getAlHaiderTypeFilters(req.query.category);
        const filteredGroups = allowedTypes
            ? groups.filter((group) => allowedTypes.includes(group.type))
            : groups;

        res.status(200).json({
            success: true,
            data: filteredGroups
        });
    } catch (error) {
        console.error("AL-HAIDER API ERROR:", error.message || error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

export const getAirlines = async (req, res) => {
    try {
        const token = getAlHaiderToken();
        const response = await axios.get(
            `${process.env.ALI_HAIDER_API_URL}api/available/airlines`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        res.status(200).json({
            success: true,
            data: response.data
        });
    } catch (error) {
        console.error("AL-HAIDER API ERROR:", error.message || error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}