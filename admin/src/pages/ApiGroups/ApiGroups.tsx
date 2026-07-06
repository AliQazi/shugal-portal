import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import axiosInstance from "../../Api/axios";
import PageMeta from "../../components/common/PageMeta";
import { toast } from "react-toastify";

const API_GROUP_CATEGORIES = [
  { key: "all", label: "All Groups" },
  { key: "uae", label: "UAE" },
  { key: "ksa", label: "KSA" },
  { key: "muscat", label: "Muscat" },
  { key: "umrah-tickets", label: "Umrah Tickets" },
  { key: "umrah-packages", label: "Umrah Packages" },
  { key: "uk", label: "UK" },
];

const TYPE_TO_CATEGORY: Record<string, string> = {
  "UAE ONE WAY GROUP": "uae",
  "ONE WAY GROUP": "ksa",
  "OMAN ONE WAY GROUP": "muscat",
  "UMRAH GROUP": "umrah-tickets",
  "UMRAH GROUPS": "umrah-tickets",
  "UK ONE WAY GROUP": "uk",
};

const AIRLINE_LOGOS: Record<string, string> = {
  flyjinnah: "/images/airlines/flyjinnah.png",
  saudi: "/images/airlines/saudia.png",
  "saudi airlines": "/images/airlines/saudia.png",
  pia: "/images/airlines/pia.png",
  "pakistan international airline": "/images/airlines/pia.png",
};

interface FlightDetail {
  flight_no: string;
  flight_date: string;
  dep_date: string;
  dept_time: string;
  arv_date: string;
  arv_time: string;
  origin: string;
  destination: string;
  baggage?: string;
  meal?: string;
}

interface ApiAirline {
  airline_name: string;
  logo_url: string | null;
  short_name: string;
}

interface ApiGroup {
  id: string | number;
  groupName?: string;
  packageName?: string | null;
  package_name?: string | null;
  packageId?: string | number;
  package_id?: string | number;
  hotels?: { makkah?: string; madina?: string } | null;
  hotel?: any;
  rates?: {
    sharing?: number;
    double?: number;
    triple?: number;
    quad?: number;
    child_without_bed?: number;
    infant?: number;
    [key: string]: unknown;
  } | null;
  source?: string;
  airline: ApiAirline | null;
  sector: string;
  price: number;
  childPrice?: number;
  infantPrice?: number;
  type?: string;
  available_no_of_pax: number;
  dept_date: string;
  arv_date: string;
  pnr?: string;
  details: FlightDetail[];
  flight?: any;
}

interface GroupedEntry {
  airline: string;
  airlineLogo: string | null;
  sector: string;
  groups: ApiGroup[];
}

const getAirlineLogo = (airlineName?: string | null) => {
  if (!airlineName) return null;

  const key = airlineName.toLowerCase().trim();

  if (AIRLINE_LOGOS[key]) return AIRLINE_LOGOS[key];

  if (key.includes("flyjinnah")) return AIRLINE_LOGOS.flyjinnah;
  if (key.includes("saudi")) return AIRLINE_LOGOS.saudi;
  if (key.includes("pakistan") || key.includes("pia")) return AIRLINE_LOGOS.pia;

  return null;
};

const getPackageName = (group: {
  packageName?: string | null;
  package_name?: string | null;
  groupName?: string | null;
  flight?: any;
}) => {
  return (
    String(
      group?.packageName ||
        group?.package_name ||
        group?.groupName ||
        group?.flight?.type ||
        ""
    ).trim() || null
  );
};

const parseGroupHotels = (group: { hotels?: any; hotel?: any }) => {
  if (!group) return null;

  if (group.hotels && typeof group.hotels === "object" && !Array.isArray(group.hotels)) {
    return group.hotels;
  }

  if (group.hotel && typeof group.hotel === "object" && !Array.isArray(group.hotel)) {
    return group.hotel;
  }

  if (Array.isArray(group.hotels)) {
    const normalized: Record<string, string> = {};

    group.hotels.forEach((entry: any) => {
      if (!entry || typeof entry !== "object") return;

      const checkValue = String(
        entry.location || entry.city || entry.name || ""
      ).toLowerCase();

      const key = checkValue.includes("madina")
        ? "madina"
        : checkValue.includes("makkah")
          ? "makkah"
          : "";

      if (key && entry.name) normalized[key] = entry.name;
    });

    return Object.keys(normalized).length ? normalized : null;
  }

  return null;
};

const normalizePackageRates = (group: {
  rates?: any;
  rate?: any;
  packageRates?: any;
  package_rates?: any;
  sharing?: any;
  quad?: any;
  triple?: any;
  double?: any;
  child_without_bed?: any;
  infant?: any;
  price?: any;
  childPrice?: any;
  infantPrice?: any;
}) => {
  const rates = group.rates || group.rate || group.packageRates || group.package_rates || {};

  const firstDefined = (...values: any[]) =>
    values.find((value) => value !== undefined && value !== null && value !== "") ?? 0;

  return {
    sharing: Number(firstDefined(rates.sharing, rates.sharing_price, rates.share, group.sharing, group.price, 0)),
    quad: Number(firstDefined(rates.quad, rates.quad_bed, rates.quadPrice, group.quad, 0)),
    triple: Number(firstDefined(rates.triple, rates.triple_bed, rates.triplePrice, group.triple, 0)),
    double: Number(firstDefined(rates.double, rates.double_bed, rates.dbl, rates.doublePrice, group.double, 0)),
    child_without_bed: Number(firstDefined(rates.child_without_bed, rates.child, group.childPrice, 0)),
    infant: Number(firstDefined(rates.infant, rates.baby, group.infantPrice, 0)),
  };
};

const parsePackageDate = (dateValue?: string | null) => {
  if (!dateValue) return null;

  const rawValue = String(dateValue).trim();
  const isoMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    if (!Number.isNaN(year) && month >= 0 && month <= 11 && !Number.isNaN(day)) {
      return new Date(year, month, day);
    }
  }

  const match = rawValue.match(/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const monthName = match[2].slice(0, 3).toLowerCase();
    const year = Number(match[3]);
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = monthNames.indexOf(monthName);

    if (!Number.isNaN(day) && month >= 0 && !Number.isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  const parsed = new Date(rawValue);
  return !Number.isNaN(parsed.getTime()) ? parsed : null;
};

const formatDate = (dateValue?: string | null) => {
  const parsed = parsePackageDate(dateValue || "");
  if (!parsed) return dateValue || "—";

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatPackageDateTime = (date?: string, time?: string) => {
  if (!date && !time) return "—";

  const parsedDate = parsePackageDate(date || "");
  const formattedDate = parsedDate
    ? parsedDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : date || "";

  return `${formattedDate}${time ? ` ${time}` : ""}`;
};

const normalizeSector = (sector: string = "") =>
  String(sector)
    .split("-")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean)
    .join("-");

const getSectorStops = (sector: string = "") =>
  String(sector)
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean);

const deriveSectorFromDetails = (group: ApiGroup) => {
  const details = Array.isArray(group.details) ? group.details.filter(Boolean) : [];
  const stops: string[] = [];

  details.forEach((detail) => {
    const origin = String(detail.origin || "").trim().toUpperCase();
    const destination = String(detail.destination || "").trim().toUpperCase();

    if (origin && stops[stops.length - 1] !== origin) {
      stops.push(origin);
    }
    if (destination && stops[stops.length - 1] !== destination) {
      stops.push(destination);
    }
  });

  return stops.join("-");
};

const getEffectiveSector = (group: ApiGroup) => {
  const sector = normalizeSector(group.sector || "");
  const sectorStops = getSectorStops(sector);
  if (sectorStops.length >= 3) return sector;

  const derived = normalizeSector(deriveSectorFromDetails(group));
  const derivedStops = getSectorStops(derived);

  return derivedStops.length > sectorStops.length ? derived : sector;
};

const getDisplayDetails = (group: ApiGroup) => {
  const details = Array.isArray(group.details) ? group.details.filter(Boolean) : [];
  const sectorStops = getSectorStops(getEffectiveSector(group));

  if (sectorStops.length < 3) {
    return details;
  }

  if (details.length === sectorStops.length - 1) {
    return details;
  }

  if (details.length > 1) {
    return details;
  }

  const baseDetail = details[0] || {};
  const departureDate =
    baseDetail.dep_date || baseDetail.flight_date || group.dept_date || null;
  const arrivalDate =
    baseDetail.arv_date || group.arv_date || departureDate;

  return sectorStops.slice(0, -1).map((origin, index) => {
    const isFirstLeg = index === 0;
    const isLastLeg = index === sectorStops.length - 2;
    const detail = details[index] || details[details.length - 1] || baseDetail;

    return {
      ...detail,
      origin,
      destination: sectorStops[index + 1],
      flight_no: detail.flight_no || "",
      dep_date: isFirstLeg ? departureDate : arrivalDate,
      flight_date: isFirstLeg ? departureDate : arrivalDate,
      dept_time: isFirstLeg ? detail.dept_time || "" : "",
      arv_time: isLastLeg ? detail.arv_time || "" : "",
    } as FlightDetail;
  });
};

const getPackageDuration = (group: ApiGroup) => {
  const departure = parsePackageDate(group.details?.[0]?.dep_date);
  const returnArrival = parsePackageDate(group.details?.[1]?.arv_date || group.details?.[group.details.length - 1]?.arv_date);

  if (!departure || !returnArrival) return null;

  return Math.max(
    0,
    Math.round((returnArrival.getTime() - departure.getTime()) / (1000 * 60 * 60 * 24)) +1
  );
};

const normalizeUmrahPackage = (pkg: any): ApiGroup => {
  const flight = pkg.flight || {};
  const flightDetails = flight.flight_details || {};
  const route = flight.route || {};
  const time = flight.time || {};
  const returnRoute = route.return || {};
  const returnTime = time.return || {};
  const airlineName = flightDetails.airline || "";

  return {
    id: pkg.package_id || flight.id || Math.random(),
    package_id: pkg.package_id,
    package_name: pkg.package_name,
    packageName: pkg.package_name,

    hotels: pkg.hotels || null,
    rates: pkg.rates || null,

    source: "umrah-packages-api",

    airline: {
      airline_name: airlineName,
      logo_url: getAirlineLogo(airlineName),
      short_name: airlineName,
    },

    sector: pkg.package_name || `${route.origin || ""}-${route.destination || ""}`,

    price: Number(pkg.rates?.sharing || flightDetails.sale_price || 0),
    childPrice: Number(pkg.rates?.child_without_bed || 0),
    infantPrice: Number(pkg.rates?.infant || 0),

    type: "UMRAH GROUPS",

    available_no_of_pax: Number(flightDetails.remain_seats || 0),

    dept_date: time.departure?.date || "",
    arv_date: returnTime.arrival?.date || "",

    pnr: flightDetails.pnr || "",

    details: [
      {
        flight_no: flightDetails.flight_number || "",
        flight_date: time.departure?.date || "",
        dep_date: time.departure?.date || "",
        dept_time: time.departure?.time || "",
        arv_date: time.arrival?.date || "",
        arv_time: time.arrival?.time || "",
        origin: route.origin || "",
        destination: route.destination || "",
        baggage: route.baggage || flightDetails.baggage || "",
        meal: flightDetails.meal || "",
      },
      {
        flight_no: returnRoute.flight_number || "",
        flight_date: returnTime.departure?.date || "",
        dep_date: returnTime.departure?.date || "",
        dept_time: returnTime.departure?.time || "",
        arv_date: returnTime.arrival?.date || "",
        arv_time: returnTime.arrival?.time || "",
        origin: returnRoute.departure || "",
        destination: returnRoute.arrival || "",
        baggage: route.baggage || flightDetails.baggage || "",
        meal: route.return_meal || flightDetails.meal || "",
      },
    ],
  };
};

const isUmrahPackageGroup = (group: any) => {
  const source = String(group?.source || "").toLowerCase();
  const isAbidAirSource = source === "abidairtravel";
  const hasPackageId = Boolean(group?.package_id || group?.packageId);
  const hasPackageName = Boolean(group?.package_name || group?.packageName || group?.groupName);
  const hasHotels = Boolean(group?.hotels || group?.hotel);
  const hasRates = Boolean(group?.rates || group?.rate || group?.packageRates || group?.package_rates);
  const isFlightPackageType = String(group?.flight?.flight_details?.type || "").toUpperCase().trim() === "UMRAH GROUPS";

  const hasPackageStructure = (hasPackageId || hasPackageName || hasHotels) && hasRates;

  return Boolean(
    isAbidAirSource && (hasPackageStructure || isFlightPackageType)
  );
};

const getCategoryFromGroup = (group: any): string => {
  const type = String(group?.type || group?.flight?.flight_details?.type || "")
    .toUpperCase()
    .trim();

  if (type === "UMRAH GROUPS" || type === "UMRAH GROUP" || isUmrahPackageGroup(group)) {
    return isUmrahPackageGroup(group) ? "umrah-packages" : "umrah-tickets";
  }

  return TYPE_TO_CATEGORY[type] || "other";
};

const buildPackageGroups = (allGroups: ApiGroup[]) => {
  const buckets: Record<
    string,
    {
      key: string;
      packageName: string;
      route: string;
      duration: number | null;
      airline: string;
      airlineLogo: string | null;
      rows: ApiGroup[];
    }
  > = {};

  const seenPackageRows = new Set<string>();

  allGroups.forEach((group) => {
    if (getCategoryFromGroup(group) !== "umrah-packages") return;

    const route = String(group.package_name || group.packageName || group.sector || "").trim();
    const firstFlightNo = group.details?.[0]?.flight_no || "";
    const airlineName = group.airline?.airline_name || "";

    const rowKey = `${group.source || ""}-${group.package_id || group.id || ""}-${group.pnr || ""}-${firstFlightNo}-${route}-${group.price || ""}`;
    if (seenPackageRows.has(rowKey)) return;
    seenPackageRows.add(rowKey);

    const key = `${route}|${firstFlightNo}|${airlineName}`;

    if (!buckets[key]) {
      buckets[key] = {
        key,
        packageName: getPackageName(group) || route,
        route: route || "Package",
        duration: getPackageDuration(group),
        airline: airlineName,
        airlineLogo: group.airline?.logo_url || getAirlineLogo(airlineName),
        rows: [],
      };
    }

    buckets[key].rows.push(group);
  });

  return Object.values(buckets);
};

const PlaneSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
  </svg>
);

// const SuitcaseSVG = ({ className = "" }: { className?: string }) => (
//   <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
//     <path d="M20 7h-3V6a3 3 0 0 0-3-3H10a3 3 0 0 0-3 3v1H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM9 6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H9V6zm11 14H4V9h16v11z" />
//   </svg>
// );

const RefreshSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="1em" height="1em">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export default function ApiGroups() {
  const [searchParams] = useSearchParams();
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentMargin, setCurrentMargin] = useState<{
    value: number;
    type: "percent" | "amount";
  } | null>(null);

  const [groupMargins, setGroupMargins] = useState<Record<string, { marginAmount: number; note: string }>>({});

  const [marginModal, setMarginModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalNote, setModalNote] = useState("");
  const [modalSaving, setModalSaving] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const activeCategory = searchParams.get("category") || "all";

  const activeCategoryLabel =
    API_GROUP_CATEGORIES.find((item) => item.key === activeCategory)?.label || "All Groups";

  const isPackageCategory = activeCategory === "umrah-packages";

  const fetchGroupMargins = async () => {
    try {
      const res = await axiosInstance.get("/group-margin/all");
      if (res.data?.success) {
        setGroupMargins(res.data.data || {});
      }
    } catch (err) {
      console.error("Failed to load group margins:", err);
    }
  };

  const fetchMargin = async () => {
    try {
      const response = await axiosInstance.get("/sector/getMargin");

      if (response.data.success) {
        setCurrentMargin({
          value: response.data.data.value,
          type: response.data.data.type,
        });
      }
    } catch (error) {
      console.error("Error fetching margin:", error);
    }
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);

      const apiCategory =
        activeCategory === "umrah-packages" || activeCategory === "umrah-tickets"
          ? "umrah"
          : activeCategory;

      const [alHaiderRes, travelNetRes, abidAirRes] = await Promise.allSettled([
        axiosInstance.get("/al-haider/available-bookings-by-group", {
          params: activeCategory === "all" ? {} : { category: apiCategory },
        }),
        axiosInstance.get("/sabaoon/admin-groups"),
        axiosInstance.get("/abidair/available-bookings-by-group"),
      ]);

      const alHaiderGroups: ApiGroup[] =
        alHaiderRes.status === "fulfilled" && alHaiderRes.value.data?.success
          ? (alHaiderRes.value.data.data || []).map((g: any) =>
              g.package_id || g.flight?.flight_details?.type === "UMRAH GROUPS"
                ? normalizeUmrahPackage(g)
                : { ...g, source: g.source || "al-haider" }
            )
          : [];

      const travelNetGroups: ApiGroup[] =
        travelNetRes.status === "fulfilled" && travelNetRes.value.data?.success
          ? (travelNetRes.value.data.data || []).map((g: any) =>
              g.package_id || g.flight?.flight_details?.type === "UMRAH GROUPS"
                ? normalizeUmrahPackage(g)
                : { ...g, source: g.source || "travel-network" }
            )
          : [];

      const abidAirGroups: ApiGroup[] =
        abidAirRes.status === "fulfilled" && abidAirRes.value.data?.success
          ? (abidAirRes.value.data.data || []).map((g: any) =>
              g.package_id || g.flight?.flight_details?.type === "UMRAH GROUPS"
                ? normalizeUmrahPackage(g)
                : { ...g, source: g.source || "abidairtravel" }
            )
          : [];

      let merged = [...alHaiderGroups, ...travelNetGroups, ...abidAirGroups];

      if (activeCategory !== "all") {
        merged = merged.filter((g) => getCategoryFromGroup(g) === activeCategory);
      }

      setGroups(merged);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load API groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchMargin();
    fetchGroupMargins();
  }, [activeCategory]);

  const getEffectiveMarginAmount = (group: ApiGroup) => {
    const cat = getCategoryFromGroup(group);
    const catKey = `group-category-${cat}`;
    if (groupMargins[catKey]) return groupMargins[catKey].marginAmount;

    const sectorKey = `sector-sector:${(group.sector || "").toUpperCase().trim()}`;
    if (groupMargins[sectorKey]) return groupMargins[sectorKey].marginAmount;

    const flightKey = `${group.source}-${group.id}`;
    if (groupMargins[flightKey]) return groupMargins[flightKey].marginAmount;

    if (!currentMargin || !currentMargin.value) return 0;

    const basePrice = group.price || 0;

    if (currentMargin.type === "percent") {
      return Math.round((basePrice * currentMargin.value) / 100);
    }

    return currentMargin.value;
  };

  const categoryHasOverride = (catKey: string) => !!groupMargins[`group-category-${catKey}`];

  const categoryOverrideAmount = (catKey: string) =>
    groupMargins[`group-category-${catKey}`]?.marginAmount ?? null;

  const openMarginModal = () => {
    setSelectedGroup("");
    setModalAmount("");
    setModalNote("");
    setMarginModal(true);
  };

  const closeMarginModal = () => {
    setMarginModal(false);
    setSelectedGroup("");
    setModalAmount("");
    setModalNote("");
  };

  const handleGroupSelect = (catKey: string) => {
    setSelectedGroup(catKey);

    const existing = groupMargins[`group-category-${catKey}`];

    setModalAmount(existing ? String(existing.marginAmount) : "");
    setModalNote(existing?.note || "");

    setTimeout(() => amountInputRef.current?.focus(), 80);
  };

  const handleSaveMargin = async () => {
    if (!selectedGroup) {
      toast.error("Please select a group first");
      return;
    }

    const amount = parseFloat(modalAmount);

    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid margin amount");
      return;
    }

    setModalSaving(true);

    try {
      await axiosInstance.post("/group-margin/set", {
        groupId: selectedGroup,
        source: "group-category",
        marginAmount: amount,
        note: modalNote,
      });

      const label =
        API_GROUP_CATEGORIES.find((c) => c.key === selectedGroup)?.label ||
        selectedGroup.toUpperCase();

      toast.success(`Margin PKR ${amount.toLocaleString()} applied to all ${label} groups`);
      closeMarginModal();
      fetchGroupMargins();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save margin");
    } finally {
      setModalSaving(false);
    }
  };

  const handleClearGroupMargin = async (catKey: string) => {
    const label =
      API_GROUP_CATEGORIES.find((c) => c.key === catKey)?.label || catKey.toUpperCase();

    if (!confirm(`Clear custom margin for all ${label} groups?`)) return;

    try {
      await axiosInstance.delete(`/group-margin/group-category/${encodeURIComponent(catKey)}`);
      toast.success(`Margin cleared for all ${label} groups`);
      fetchGroupMargins();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to clear margin");
    }
  };

  const groupedData = groups.reduce<Record<string, GroupedEntry>>((acc, group) => {
    const effectiveSector = getEffectiveSector(group) || "Unknown";
    const sector = effectiveSector.toUpperCase().trim();
    const key = sector;

    if (!acc[key]) {
      acc[key] = {
        airline: group.airline?.airline_name || "",
        airlineLogo: group.airline?.logo_url || null,
        sector,
        groups: [],
      };
    } else if (!acc[key].airlineLogo && group.airline?.logo_url) {
      acc[key].airlineLogo = group.airline.logo_url;
      acc[key].airline = group.airline.airline_name || acc[key].airline;
    }

    acc[key].groups.push(group);

    return acc;
  }, {});

  const LoadingSkeleton = () => (
    <div className="space-y-6 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="h-12 rounded-2xl bg-gray-200 mb-4 w-full" />
          {[1, 2].map((j) => (
            <div key={j} className="h-24 bg-gray-100 rounded-2xl mb-3" />
          ))}
        </div>
      ))}
    </div>
  );

  const renderPackageCategory = (allGroups: ApiGroup[]) => {
    const packageGroups = buildPackageGroups(allGroups);

    if (packageGroups.length === 0) {
      return (
        <div className="text-center py-16 text-gray-400">
          No package groups returned from API
        </div>
      );
    }

    // Sort package groups by earliest departure date
    const sortedPackageGroups = packageGroups.slice().sort((a, b) => {
      const getMinDate = (rows: ApiGroup[]): Date | null => {
        let minDate: Date | null = null;
        rows.forEach((row) => {
          const da = row.dept_date || row.details?.[0]?.dep_date || "";
          const parsed = parsePackageDate(da);
          if (parsed) {
            if (!minDate || parsed.getTime() < minDate.getTime()) {
              minDate = parsed;
            }
          }
        });
        return minDate;
      };

      const dateA = getMinDate(a.rows);
      const dateB = getMinDate(b.rows);

      if (dateA !== null && dateB !== null) return dateA.getTime() - dateB.getTime();
      if (dateA !== null) return -1;
      if (dateB !== null) return 1;
      return 0;
    });

    return (
      <div className="space-y-10">
        {sortedPackageGroups.map((packageGroup) => (
          <div key={packageGroup.key} className="bg-white">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 mb-5">
              <div className="flex items-center gap-4">
                {packageGroup.airlineLogo ? (
                  <img
                    src={packageGroup.airlineLogo}
                    alt={packageGroup.airline || "Package airline logo"}
                    className="h-12 w-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {packageGroup.route}
                  </div>
                  <div className="flex flex-col gap-1 text-xs uppercase tracking-widest text-gray-500">
                    {packageGroup.airline ? (
                      <span className="text-left text-[11px] font-semibold text-slate-500">
                        {packageGroup.airline}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700 border border-blue-100">
                      Umrah Package
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right text-2xl font-normal text-gray-900">
                {packageGroup.duration !== null
                  ? `${packageGroup.duration} days`
                  : "Duration unknown"}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-300 border-collapse text-sm">
                <thead>
                  <tr className="bg-white text-left text-xs font-bold text-gray-600">
                    <th className="border border-gray-300 px-3 py-3 w-[32%]">Hotels</th>
                    <th className="border border-gray-300 px-3 py-3">Departure</th>
                    <th className="border border-gray-300 px-3 py-3">Arrival</th>
                    <th className="border border-gray-300 px-3 py-3">Dep Date Time</th>
                    <th className="border border-gray-300 px-3 py-3">Arr Date Time</th>
                    <th className="border border-gray-300 px-3 py-3">Sharing</th>
                    <th className="border border-gray-300 px-3 py-3">Quad</th>
                    <th className="border border-gray-300 px-3 py-3">Tripple</th>
                    <th className="border border-gray-300 px-3 py-3">Double</th>
                  </tr>
                </thead>

                <tbody>
                  {packageGroup.rows
                    .slice()
                    .sort((a, b) => {
                      const da = a.dept_date || a.details?.[0]?.dep_date || "";
                      const db = b.dept_date || b.details?.[0]?.dep_date || "";
                      const parsedA = parsePackageDate(da);
                      const parsedB = parsePackageDate(db);
                      if (parsedA && parsedB) return parsedA.getTime() - parsedB.getTime();
                      return da.localeCompare(db);
                    })
                    .map((row) => {
                    const details = row.details || [];
                    const goingFlight = details[0] || {};
                    const returnFlight = details[1] || {};
                    const packageHotels = parseGroupHotels(row);
                    const packageRates = normalizePackageRates(row);

                    return (
                      <tr
                        key={`${row.package_id || row.id}-${row.pnr || ""}`}
                        className="bg-white hover:bg-gray-50"
                      >
                        <td className="border border-gray-300 px-3 py-3 align-top leading-7 text-gray-700">
                          <div>Makkah: {packageHotels?.makkah || "—"}</div>
                          <div>Madina: {packageHotels?.madina || "—"}</div>
                        </td>

                        <td className="border border-gray-300 px-3 py-3 align-top leading-7 text-gray-700">
                          <div>{goingFlight.origin || "—"}</div>
                          <div>{returnFlight.origin || "—"}</div>
                        </td>

                        <td className="border border-gray-300 px-3 py-3 align-top leading-7 text-gray-700">
                          <div>{goingFlight.destination || "—"}</div>
                          <div>{returnFlight.destination || "—"}</div>
                        </td>

                        <td className="border border-gray-300 px-3 py-3 align-top leading-7 text-gray-700">
                          <div>
                            {formatPackageDateTime(
                              goingFlight.dep_date,
                              goingFlight.dept_time
                            )}
                          </div>
                          <div>
                            {formatPackageDateTime(
                              returnFlight.dep_date,
                              returnFlight.dept_time
                            )}
                          </div>
                        </td>

                        <td className="border border-gray-300 px-3 py-3 align-top leading-7 text-gray-700">
                          <div>
                            {formatPackageDateTime(
                              goingFlight.arv_date,
                              goingFlight.arv_time
                            )}
                          </div>
                          <div>
                            {formatPackageDateTime(
                              returnFlight.arv_date,
                              returnFlight.arv_time
                            )}
                          </div>
                        </td>

                        <td className="border border-gray-300 px-3 py-3 align-top text-blue-600">
                          {packageRates.sharing ? packageRates.sharing.toLocaleString() : "—"}
                        </td>

                        <td className="border border-gray-300 px-3 py-3 align-top text-blue-600">
                          {packageRates.quad ? packageRates.quad.toLocaleString() : "—"}
                        </td>

                        <td className="border border-gray-300 px-3 py-3 align-top text-blue-600">
                          {packageRates.triple ? packageRates.triple.toLocaleString() : "—"}
                        </td>

                        <td className="border border-gray-300 px-3 py-3 align-top text-blue-600">
                          {packageRates.double ? packageRates.double.toLocaleString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <PageMeta
        title={`${activeCategoryLabel} API Groups | Admin`}
        description="View API group flights"
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 min-h-screen">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              {activeCategoryLabel} API Groups
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchGroups}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition disabled:opacity-50"
            >
              <RefreshSVG className={`text-base ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              onClick={openMarginModal}
              disabled={loading || groups.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white transition disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Set Group Margin
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {API_GROUP_CATEGORIES.map((category) => {
            const target =
              category.key === "all"
                ? "/api-groups"
                : `/api-groups?category=${encodeURIComponent(category.key)}`;

            return (
              <Link
                key={category.key}
                to={target}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeCategory === category.key
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                }`}
              >
                {category.label}
              </Link>
            );
          })}
        </div>

        {API_GROUP_CATEGORIES.filter((c) => c.key !== "all" && categoryHasOverride(c.key)).length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {API_GROUP_CATEGORIES.filter((c) => c.key !== "all" && categoryHasOverride(c.key)).map((cat) => (
              <div
                key={cat.key}
                className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5"
              >
                <span className="text-xs font-bold text-orange-700">
                  {cat.label}: PKR {categoryOverrideAmount(cat.key)?.toLocaleString()}
                </span>
                <button
                  onClick={() => handleClearGroupMargin(cat.key)}
                  title={`Clear ${cat.label} margin`}
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-[10px] font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {currentMargin && currentMargin.value > 0 && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-medium text-green-700">
              Active Margin:
              <span className="ml-2 font-bold">
                {currentMargin.value}
                {currentMargin.type === "percent" ? "%" : " PKR"}
              </span>
            </p>
          </div>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : groups.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            No {activeCategoryLabel.toLowerCase()} groups returned from API
          </div>
        ) : (
          <div className="space-y-4">
            {isPackageCategory ? (
              renderPackageCategory(groups)
            ) : (
              Object.entries(groupedData).map(([key, data]) => (
                <div
                  key={key}
                  className="rounded-2xl overflow-hidden border border-neutral-200"
                >
                  <div className="flex items-center justify-center gap-6 py-2.5 bg-linear-to-r from-blue-50 via-white to-blue-50 border-b border-neutral-200">
                    <div className="flex items-center justify-center min-w-16">
                      {data.airlineLogo ? (
                        <img
                          src={data.airlineLogo}
                          alt={data.airline}
                          style={{ height: "52px" }}
                          className="object-contain"
                        />
                      ) : (
                        <span className="font-semibold text-sm text-gray-700">
                          {data.airline}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <PlaneSVG className="text-blue-500 text-lg" />
                      <span className="font-bold text-lg tracking-widest uppercase text-gray-800">
                        {data.sector}
                      </span>
                    </div>

                    {(() => {
                      const sources = [...new Set(data.groups.map((g) => g.source))];

                      return (
                        <div className="flex items-center gap-1.5">
                          {sources.includes("al-haider") && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide border bg-emerald-100 text-emerald-700 border-emerald-200">
                              AL-HAIDER
                            </span>
                          )}
                          {sources.includes("travel-network") && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide border bg-amber-100 text-amber-700 border-amber-200">
                              TRAVEL NETWORK
                            </span>
                          )}
                          {sources.includes("abidairtravel") && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide border bg-purple-100 text-purple-700 border-purple-200">
                              AbidAir Travels
                            </span>
                          )}
                          {sources.includes("sabaoon") && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide border bg-sky-100 text-sky-700 border-sky-200">
                             AL-SABOOR
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr
                          className="text-white text-xs font-bold"
                          style={{
                            background: "linear-gradient(90deg, #21397C 0%, #2CA3B4 100%)",
                          }}
                        >
                          <th className="px-4 py-2.5 text-left whitespace-nowrap">Date</th>
                          <th className="px-4 py-2.5 text-left whitespace-nowrap">Flight</th>
                          <th className="px-4 py-2.5 text-left whitespace-nowrap">Airline</th>
                          <th className="px-4 py-2.5 text-left whitespace-nowrap">Source</th>
                          <th className="px-4 py-2.5 text-center whitespace-nowrap">Sector</th>
                          <th className="px-4 py-2.5 text-center whitespace-nowrap">Bag</th>
                          <th className="px-4 py-2.5 text-center whitespace-nowrap">Meal</th>
                          <th className="px-4 py-2.5 text-center whitespace-nowrap">Seats</th>
                          <th className="px-4 py-2.5 text-center whitespace-nowrap">Base Price</th>
                          <th className="px-4 py-2.5 text-center whitespace-nowrap">Margin</th>
                          <th className="px-4 py-2.5 text-center whitespace-nowrap">Final Price</th>
                        </tr>
                      </thead>

                      <tbody>
                        {data.groups
                          .slice()
                          .sort((a, b) => {
                            const da = a.dept_date || a.details?.[0]?.dep_date || "";
                            const db = b.dept_date || b.details?.[0]?.dep_date || "";
                            const parsedA = parsePackageDate(da);
                            const parsedB = parsePackageDate(db);
                            if (parsedA && parsedB) return parsedA.getTime() - parsedB.getTime();
                            return da.localeCompare(db);
                          })
                          .map((group) => {
                            const displayDetails = getDisplayDetails(group);
                            const effectiveSector = getEffectiveSector(group) || group.sector || "";
                            const flight = displayDetails[0];
                            const isMultiLeg = displayDetails.length > 1;

                            const basePrice = Number(group.price || 0);
                            const marginAmount = getEffectiveMarginAmount(group);
                            const finalPrice = basePrice + marginAmount;
                            const groupCat = getCategoryFromGroup(group);

                            return (
                              <tr
                                key={`${group.source}-${group.id}`}
                                className={`border-b border-gray-100 transition-colors ${
                                  categoryHasOverride(groupCat)
                                    ? "bg-orange-50/40 hover:bg-orange-50"
                                    : "bg-white hover:bg-blue-50/40"
                                }`}
                              >
                                <td className="px-4 py-3 text-xs font-medium text-gray-600 align-top">
                                  {isMultiLeg ? (
                                    <div className="flex flex-col divide-y divide-dashed divide-gray-300">
                                      {displayDetails.map((d, i) => {
                                        const rawDate = d.dep_date || d.flight_date;

                                        return (
                                          <div
                                            key={i}
                                            className={`font-bold text-xs whitespace-nowrap ${
                                              i > 0 ? "pt-2" : "pb-2"
                                            }`}
                                          >
                                            {formatDate(rawDate)}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="font-bold whitespace-nowrap">
                                      {flight ? formatDate(flight.flight_date || flight.dep_date) : "—"}
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-3 align-top">
                                  {isMultiLeg ? (
                                    <div className="flex flex-col divide-y divide-dashed divide-gray-300">
                                      {displayDetails.map((d, i) => (
                                        <div key={i} className={i > 0 ? "pt-2" : "pb-2"}>
                                          <div className="font-bold text-gray-800 text-xs">
                                            {d.flight_no || "—"}
                                          </div>
                                          <div className="text-[11px] text-gray-500">
                                            {d.dept_time?.substring(0, 5) || "—"} -{" "}
                                            {d.arv_time?.substring(0, 5) || "—"}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <>
                                      <div className="font-bold text-gray-800 text-xs">
                                        {flight?.flight_no || "—"}
                                      </div>
                                      <div className="text-[11px] text-gray-500">
                                        {flight?.dept_time?.substring(0, 5) || "—"} -{" "}
                                        {flight?.arv_time?.substring(0, 5) || "—"}
                                      </div>
                                    </>
                                  )}
                                </td>

                                <td className="px-4 py-3 text-xs font-medium text-gray-700 align-top">
                                  <div className="flex items-center gap-2">
                                    <span>{group.airline?.airline_name || "—"}</span>
                                    {getCategoryFromGroup(group) === "umrah-packages" && (
                                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700 border border-blue-100">
                                        Umrah Package
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="px-4 py-3 text-xs font-medium text-gray-700 align-top">
                                  {group.source || "—"}
                                </td>

                                <td className="px-4 py-3 text-xs font-bold text-center text-gray-700 align-top">
                                  {effectiveSector || "—"}
                                </td>

                                <td className="px-4 py-3 text-xs text-center text-gray-700 align-top">
                                  {flight?.baggage || "—"}
                                </td>

                                <td className="px-4 py-3 text-xs text-center text-gray-700 align-top">
                                  {flight?.meal || "—"}
                                </td>

                                <td className="px-4 py-3 text-xs text-center font-bold text-gray-700 align-top">
                                  {group.available_no_of_pax ?? "—"}
                                </td>

                                <td className="px-4 py-3 text-xs text-center font-bold text-gray-700 align-top">
                                  PKR {basePrice.toLocaleString()}
                                </td>

                                <td className="px-4 py-3 text-xs text-center font-bold text-orange-600 align-top">
                                  PKR {marginAmount.toLocaleString()}
                                </td>

                                <td className="px-4 py-3 text-xs text-center font-bold text-blue-700 align-top">
                                  PKR {finalPrice.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {marginModal && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-800">Set Group Margin</h2>
              <p className="mt-1 text-sm text-gray-500">
                This margin will apply to all groups under selected category.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Select Group
                </label>

                <select
                  value={selectedGroup}
                  onChange={(e) => handleGroupSelect(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select group</option>
                  {API_GROUP_CATEGORIES.filter((c) => c.key !== "all").map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Margin Amount
                </label>

                <input
                  ref={amountInputRef}
                  type="number"
                  min="0"
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  placeholder="Enter margin amount"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Note
                </label>

                <textarea
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="Optional note"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeMarginModal}
                disabled={modalSaving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveMargin}
                disabled={modalSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {modalSaving ? "Saving..." : "Save Margin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
