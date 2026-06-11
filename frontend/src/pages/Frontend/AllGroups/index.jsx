import React, { useEffect, useState, useContext } from "react";
import { FaRegCopy, FaCheck } from "react-icons/fa";
import { DashboardUIContext } from "../../../components/Dashboard/DashboardLayout";
import { Ticket, Menu, X } from "lucide-react";
import {
  FaPlane,
  FaSuitcase,
  FaUtensils,
  FaSearch,
  FaPlaneDeparture,
  FaPlaneArrival,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import MaskedDatePicker from "../../../components/MaskedDatePicker";
import { theme } from "../../../theme/theme";
import TopBar from "../../../components/TopBar/TopBar";
import { groupTypes } from "../../../data/groupTypes";

const TYPE_TO_CATEGORY = {
  "UAE ONE WAY GROUP": "uae",
  "ONE WAY GROUP": "ksa",
  "OMAN ONE WAY GROUP": "muscat",
  "UMRAH GROUP": "umrah-tickets",
  "UMRAH GROUPS": "umrah-tickets",
  "UK ONE WAY GROUP": "uk",
};

// City to Airport Code Mapping
const CITY_TO_AIRPORT = {
  "FAISALABAD": "LYP",
  "JEDDAH": "JED",
  "MEDINA": "MED",
  "MADINAH": "MED",
  "ISLAMABAD": "ISB",
  "DAMMAM": "DMM",
  "MUSCAT": "MCT",
  "RIYADH": "RUH",
  "LAHORE": "LHE",
  "DUBAI": "DXB",
  "MULTAN": "MUX",
  "PESHAWAR": "PEW",
  "SIALKOT": "SKT",
  "SHARJAH": "SHJ",
  // Already airport codes (3-letter) - keep as is
  "LYP": "LYP",
  "JED": "JED",
  "MED": "MED",
  "ISB": "ISB",
  "DMM": "DMM",
  "MCT": "MCT",
  "RUH": "RUH",
  "LHE": "LHE",
  "DXB": "DXB",
  "MUX": "MUX",
  "PEW": "PEW",
  "SKT": "SKT",
  "SHJ": "SHJ",
};

// Convert sector string to airport codes (e.g., "FAISALABAD-JEDDAH" → "LYP-JED")
const normalizeSector = (sector = "") => {
  const parts = String(sector)
    .split("-")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
  
  return parts
    .map((part) => CITY_TO_AIRPORT[part] || part)
    .join("-");
};

const getSectorStops = (sector = "") =>
  String(sector)
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean);

const deriveSectorFromDetails = (group = {}) => {
  const details = Array.isArray(group?.details) ? group.details.filter(Boolean) : [];
  if (details.length === 0) return "";

  const stops = [];
  details.forEach((detail) => {
    const origin = String(detail.origin || detail.from || "").trim().toUpperCase();
    const destination = String(detail.destination || detail.to || "").trim().toUpperCase();

    if (origin && stops[stops.length - 1] !== origin) {
      stops.push(origin);
    }
    if (destination && stops[stops.length - 1] !== destination) {
      stops.push(destination);
    }
  });

  return stops.map((part) => CITY_TO_AIRPORT[part] || part).join("-");
};

const getEffectiveSector = (group = {}) => {
  const sector = normalizeSector(group?.sector || "");
  const sectorStops = getSectorStops(sector);
  if (sectorStops.length >= 3) return sector;

  const derived = deriveSectorFromDetails(group);
  const derivedStops = getSectorStops(derived);

  return derivedStops.length > sectorStops.length ? derived : sector;
};

const PACKAGE_DURATION_BUCKETS = [15, 21, 28];

const getDurationBucket = (duration) => {
  const value = Number(duration);
  if (Number.isNaN(value) || value <= 0) return null;
  if (value >= 26 && value <= 29) return 28;
  if (value >= 19 && value <= 22) return 21;
  if (value >= 13 && value <= 15) return 15;
  return null;
};

const getGroupDuration = (group = {}) => {
  const rawDuration = group?.days || group?.duration || group?.packageDuration;
  const value = Number(rawDuration);
  if (!Number.isNaN(value) && value > 0) {
    return value;
  }

  const details = Array.isArray(group?.details) ? group.details.filter(Boolean) : [];
  const firstRaw = details[0]?.dep_date || details[0]?.flight_date || group?.dept_date;
  const lastRaw =
    details[details.length - 1]?.dep_date ||
    details[details.length - 1]?.flight_date ||
    group?.arv_date;

  if (firstRaw && lastRaw) {
    const diff = Math.round((new Date(lastRaw) - new Date(firstRaw)) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  }

  return null;
};

const getCategoryFromGroup = (group = {}) => {
  if (isUmrahPackageGroup(group)) return "umrah-packages";

  const type = String(group?.type || "").toUpperCase().trim();
  return TYPE_TO_CATEGORY[type] || "";
};

const isUmrahPackageGroup = (group = {}) =>
  Boolean(
    group?.packageName ||
    group?.hotels ||
    group?.rates ||
    group?.packageId ||
    group?.package_id,
  );

const getDisplayDetails = (group = {}) => {
  const details = Array.isArray(group?.details) ? group.details.filter(Boolean) : [];
  const sectorStops = getSectorStops(getEffectiveSector(group));

  if (sectorStops.length < 3) {
    return details;
  }

  // If the provided details already match the expected number of legs, or if the group already has multiple flight details,
  // keep the source details as the true flights rather than reconstructing legs from all sector stops.
  if (details.length === sectorStops.length - 1 || details.length > 1) {
    return details;
  }

  const baseDetail = details[0] || {};
  const departureDate =
    baseDetail.dep_date || baseDetail.flight_date || group?.dept_date || null;
  const arrivalDate =
    baseDetail.arv_date || group?.arv_date || departureDate;

  return sectorStops.slice(0, -1).map((origin, index) => {
    const isFirstLeg = index === 0;
    const isLastLeg = index === sectorStops.length - 2;
    const detail = details[index] || details[details.length - 1] || baseDetail;

    return {
      ...detail,
      sr: index + 1,
      origin,
      destination: sectorStops[index + 1],
      flight_no: detail.flight_no || detail.flightNo || "",
      dep_date: isFirstLeg ? departureDate : arrivalDate,
      flight_date: isFirstLeg ? departureDate : arrivalDate,
      dept_time: isFirstLeg
        ? detail.dept_time || detail.dep_time || detail.depTime || ""
        : "",
      arv_time: isLastLeg
        ? detail.arv_time || detail.arr_time || detail.arvTime || ""
        : "",
    };
  });
};

const formatBaggageLabel = (value) => {
  const baggage = String(value || "").trim();
  if (!baggage) return "";
  if (/^\d+(\.\d+)?$/.test(baggage)) return `${baggage}KG`;
  return baggage;
};

export default function AllGroups({ headerType, header, searchParams, user }) {
  // Copy feedback state
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedRow, setCopiedRow] = useState({});
  // Build copy text for all groups (similar to admin dashboard)
  const buildCopyText = (groupsList) => {
    if (!groupsList.length) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const MONTHS_TITLE = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const header = `*=====${String(today.getDate()).padStart(2, "0")} ${MONTHS_TITLE[today.getMonth()].toUpperCase()} UPDATES=====*`;
    const lines = groupsList
      .map((g) => {
        const details = g.details && g.details.length > 0 ? g.details : [{}];
        const legs = details.map((d) => {
          const rawDate = d.dep_date || d.flight_date || g.dept_date;
          if (!rawDate) return null;
          const date = new Date(rawDate);
          if (isNaN(date.getTime())) return null;
          const dd = String(date.getDate()).padStart(2, "0");
          const mon = MONTHS_TITLE[date.getMonth()];
          const year = date.getFullYear();
          const flightNo = (d.flight_no || d.flightNo || "").toUpperCase();
          const origin = d.origin || d.from || "";
          const dest = d.destination || d.to || "";
          const depTime = (d.dept_time || d.dep_time || d.depTime || "").slice(0, 5);
          const arvTime = (d.arv_time || d.arr_time || d.arrTime || "").slice(0, 5);
          const depPart = depTime ? ` (${depTime})` : "";
          const arvPart = arvTime ? ` (${arvTime})` : "";
          return `${flightNo} *${dd} ${mon} ${year}* ${origin}${depPart} ${dest}${arvPart}`;
        }).filter(Boolean);
        if (!legs.length) return null;
        const price = calculatePriceAfterMargin(g.price, g) ?? (g.price || 0);
        if (legs.length === 1) return `${legs[0]}..... *PKR ${price.toLocaleString()}*`;
        const labeledLegs = legs.map((leg, i) => {
          if (i === 0) return `*Departure:* ${leg}`;
          if (i === legs.length - 1) return `*Arrival:* ${leg}..... *PKR ${price.toLocaleString()}*`;
          return `*LEG ${i + 1}:* ${leg}`;
        });
        return labeledLegs.join("\n");
      })
      .filter(Boolean);
    const footer = `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*\n=======================\nShaheen Wings Travels\nMobile: 0309-9802154\nAddress: MA Plaza Ground Floor Shop # 3, Kahror Pacca.\nPtcl: 0608340174\nWebsite: shaheenwingstravels.com`;
    return [header, ...lines, "=======================", footer].join("\n");
  };

  // Build copy text for a single group/flight row (with footer)
  const buildRowCopyText = (group) => {
    const MONTHS_TITLE = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const details = group.details && group.details.length > 0 ? group.details : [{}];
    const legs = details.map((d) => {
      const rawDate = d.dep_date || d.flight_date || group.dept_date;
      if (!rawDate) return null;
      const date = new Date(rawDate);
      if (isNaN(date.getTime())) return null;
      const dd = String(date.getDate()).padStart(2, "0");
      const mon = MONTHS_TITLE[date.getMonth()];
      const year = date.getFullYear();
      const flightNo = (d.flight_no || d.flightNo || "").toUpperCase();
      const origin = d.origin || d.from || "";
      const dest = d.destination || d.to || "";
      const depTime = (d.dept_time || d.dep_time || d.depTime || "").slice(0, 5);
      const arvTime = (d.arv_time || d.arr_time || d.arrTime || "").slice(0, 5);
      const depPart = depTime ? ` (${depTime})` : "";
      const arvPart = arvTime ? ` (${arvTime})` : "";
      return `${flightNo} *${dd} ${mon} ${year}* ${origin}${depPart} ${dest}${arvPart}`;
    }).filter(Boolean);
    if (!legs.length) return "";
    const price = calculatePriceAfterMargin(group.price, group) ?? (group.price || 0);
    const footer = `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*\n=======================\nShaheen Wings Travels\nMobile: 0309-9802154\nAddress: MA Plaza Ground Floor Shop # 3, Kahror Pacca.\nPtcl: 0608340174\nWebsite: shaheenwingstravels.com`;
    let flightLines;
    if (legs.length === 1) {
      flightLines = `${legs[0]}..... *PKR ${price.toLocaleString()}*`;
    } else {
      const labeledLegs = legs.map((leg, i) => {
        if (i === 0) return `*Departure:* ${leg}`;
        if (i === legs.length - 1) return `*Arrival:* ${leg}..... *PKR ${price.toLocaleString()}*`;
        return `*LEG ${i + 1}:* ${leg}`;
      });
      flightLines = labeledLegs.join("\n");
    }
    return `${flightLines}\n=======================\n${footer}`;
  };

  // Build copy text for all groups in a sector (with footer)
  const buildSectorCopyText = (sectorGroups) => {
    if (!sectorGroups.length) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const MONTHS_TITLE = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const header = `                *=====${String(today.getDate()).padStart(2, "0")} ${MONTHS_TITLE[today.getMonth()].toUpperCase()} UPDATES=====*`;
    const lines = sectorGroups
      .map((g) => {
        const details = g.details && g.details.length > 0 ? g.details : [{}];
        const legs = details.map((d) => {
          const rawDate = d.dep_date || d.flight_date || g.dept_date;
          if (!rawDate) return null;
          const date = new Date(rawDate);
          if (isNaN(date.getTime())) return null;
          const dd = String(date.getDate()).padStart(2, "0");
          const mon = MONTHS_TITLE[date.getMonth()];
          const year = date.getFullYear();
          const flightNo = (d.flight_no || d.flightNo || "").toUpperCase();
          const origin = d.origin || d.from || "";
          const dest = d.destination || d.to || "";
          const depTime = (d.dept_time || d.dep_time || d.depTime || "").slice(0, 5);
          const arvTime = (d.arv_time || d.arr_time || d.arrTime || "").slice(0, 5);
          const depPart = depTime ? ` (${depTime})` : "";
          const arvPart = arvTime ? ` (${arvTime})` : "";
          return `${flightNo} *${dd} ${mon} ${year}* ${origin}${depPart} ${dest}${arvPart}`;
        }).filter(Boolean);
        if (!legs.length) return null;
        const price = calculatePriceAfterMargin(g.price, g) ?? (g.price || 0);
        if (legs.length === 1) return `${legs[0]}..... *PKR ${price.toLocaleString()}*`;
        const labeledLegs = legs.map((leg, i) => {
          if (i === 0) return `*Departure:* ${leg}`;
          if (i === legs.length - 1) return `*Arrival:* ${leg}..... *PKR ${price.toLocaleString()}*`;
          return `*LEG ${i + 1}:* ${leg}`;
        });
        return labeledLegs.join("\n");
      })
      .filter(Boolean);
    const footer = `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*\n=======================\nShaheen Wings Travels\nMobile: 0309-9802154\nAddress: MA Plaza Ground Floor Shop # 3, Kahror Pacca.\nPtcl: 0608340174\nWebsite: shaheenwingstravels.com`;
    return [header, ...lines, "=======================", footer].join("\n");
  };

  // Copy handler for sector
  const [copiedSector, setCopiedSector] = useState({});
  const handleCopySector = async (sectorKey, sectorGroups) => {
    const text = buildSectorCopyText(sectorGroups);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSector((prev) => ({ ...prev, [sectorKey]: true }));
      setTimeout(
        () => setCopiedSector((prev) => ({ ...prev, [sectorKey]: false })),
        2000,
      );
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedSector((prev) => ({ ...prev, [sectorKey]: true }));
      setTimeout(
        () => setCopiedSector((prev) => ({ ...prev, [sectorKey]: false })),
        2000,
      );
    }
  };

  // Copy handlers
  const handleCopyAll = async () => {
    const text = buildCopyText(groups);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const handleCopyRow = async (group) => {
    const text = buildRowCopyText(group);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRow((prev) => ({ ...prev, [group.id]: true }));
      setTimeout(
        () => setCopiedRow((prev) => ({ ...prev, [group.id]: false })),
        2000,
      );
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedRow((prev) => ({ ...prev, [group.id]: true }));
      setTimeout(
        () => setCopiedRow((prev) => ({ ...prev, [group.id]: false })),
        2000,
      );
    }
  };
  // Access Dashboard UI context if available (only in dashboard route)
  const dashboardUI = useContext(DashboardUIContext);
  // On mount: close sidebar and open advanced search if in dashboard
  useEffect(() => {
    if (dashboardUI) {
      dashboardUI.setSidebarOpen(false);
      setShowAdvancedSearch(true);
    }
    // eslint-disable-next-line
  }, []);
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [dbMargin, setDbMargin] = useState(null);
  const [groupMargins, setGroupMargins] = useState({});
  const [bookingList, setBookingList] = useState([]);
  const [bookedSeatsMap, setBookedSeatsMap] = useState({});

  const [filters, setFilters] = useState({
    sectors: [],
    airlines: [],
    durations: [],
    searchKeyword: "",
    departDate: null,
  });

  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const currentGroupType = searchParams?.get("group_type") || "";
  const [airlines, setAirlines] = useState([]);
  const [sectors, setSectors] = useState([]);

  const calculateB2BPrice = (groupPrice, group = {}) => {
    if (user?.priceOnCall) return null;

    let finalPrice = groupPrice || 0;

    // =========================
    // 1. MARGIN APPLY FIRST
    // =========================

    const marginType = user?.marginType;
    const marginPercent = user?.flightMarginPercent;
    const marginAmount = user?.flightMarginAmount;

    if (marginType === "Percentage" && marginPercent > 0) {
      finalPrice += (groupPrice * marginPercent) / 100;
    } else if (marginType === "Amount" && marginAmount > 0) {
      finalPrice += marginAmount;
    }

    // Group-category margin (fallback)
    if (finalPrice === (groupPrice || 0)) {
      const category = getCategoryFromGroup(group);
      const categoryKey = `group-category-${category}`;
      const categoryMargin = groupMargins?.[categoryKey]?.marginAmount;
      if (typeof categoryMargin === "number") {
        finalPrice += categoryMargin;
      }
    }

    // Group-level margin (fallback)
    if (finalPrice === (groupPrice || 0)) {
      const indMargin = group?.individualMargin;

      if (indMargin !== null && indMargin !== undefined) {
        finalPrice += indMargin;
      }
    }

    // DB/global margin fallback
    if (finalPrice === (groupPrice || 0) && dbMargin) {
      if (dbMargin.type === "percent" && dbMargin.value > 0) {
        finalPrice += ((groupPrice || 0) * dbMargin.value) / 100;
      } else if (dbMargin.type === "amount" && dbMargin.value > 0) {
        finalPrice += dbMargin.value;
      }
    }

    // =========================
    // 2. DISCOUNT APPLY LAST
    // =========================

    const discountType = user.discountType;
    const discountPercent = user.discountPercent;
    const discountAmount = user.discountAmount;

    let discountValue = 0;

    if (discountType === "Percentage" && discountPercent > 0) {
      discountValue = (finalPrice * discountPercent) / 100;
    } else if (discountType === "Amount" && discountAmount > 0) {
      discountValue = discountAmount;
    }

    finalPrice = finalPrice - discountValue;

    // prevent negative price
    if (finalPrice < 0) finalPrice = 0;

    return Math.round(finalPrice).toLocaleString();
  };

  // Shows the price right after margin application (before any user discount)
  const calculatePriceAfterMargin = (groupPrice, group = {}) => {
    if (user?.priceOnCall) return null;

    let priceAfterMargin = groupPrice || 0;

    const marginType = user?.marginType;
    const marginPercent = user?.flightMarginPercent;
    const marginAmount = user?.flightMarginAmount;

    if (marginType === "Percentage" && marginPercent > 0) {
      priceAfterMargin += (priceAfterMargin * marginPercent) / 100;
    } else if (marginType === "Amount" && marginAmount > 0) {
      priceAfterMargin += marginAmount;
    }

    // Group-category margin (fallback)
    if (priceAfterMargin === (groupPrice || 0)) {
      const category = getCategoryFromGroup(group);
      const categoryKey = `group-category-${category}`;
      const categoryMargin = groupMargins?.[categoryKey]?.marginAmount;
      if (typeof categoryMargin === "number") {
        priceAfterMargin += categoryMargin;
      }
    }

    // Group-level margin (fallback)
    if (priceAfterMargin === (groupPrice || 0)) {
      const indMargin = group?.individualMargin;
      if (indMargin !== null && indMargin !== undefined) {
        priceAfterMargin += indMargin;
      }
    }

    // DB/global margin fallback
    if (priceAfterMargin === (groupPrice || 0) && dbMargin) {
      if (dbMargin.type === "percent" && dbMargin.value > 0) {
        priceAfterMargin += (priceAfterMargin * dbMargin.value) / 100;
      } else if (dbMargin.type === "amount" && dbMargin.value > 0) {
        priceAfterMargin += dbMargin.value;
      }
    }

    if (priceAfterMargin < 0) priceAfterMargin = 0;
    return Math.round(priceAfterMargin);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchGroups();
    fetchBookingVoucher();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchBookingVoucher = async () => {
    const res = await axiosInstance.get("/bookings/");
    setBookingList(res.data.data);

    const map = {};

    res.data.data.forEach((booking) => {
      const passengersLength = booking.passengers?.length || 0;

      booking.flights?.forEach((flight) => {
        const key = `${flight.flightNo}_${new Date(flight.depDate).toISOString().split("T")[0]
          }`;

        // ignore cancelled if needed
        if (booking.status !== "cancelled") {
          map[key] = (map[key] || 0) + passengersLength;
        }
      });
    });

    // console.log("FINAL MAP:", map); // 👈 DEBUG THIS
    setBookedSeatsMap(map);
  };
  // console.log(bookings, "hello2222")
  const fetchGroups = async () => {
    try {
      setLoading(true);

      const groupType = searchParams.get("group_type") || "";

      // Single unified call (admin + sabaoon, sector-sorted, past-filtered) + margin in parallel
      const [unifiedRes, marginRes, groupMarginRes] = await Promise.allSettled([
        axiosInstance.get("/sector/getUnifiedGroups"),
        axiosInstance.get("/sector/getMargin"),
        axiosInstance.get("/group-margin/all"),
      ]);

      if (marginRes.status === "fulfilled" && marginRes.value.data?.success) {
        setDbMargin(marginRes.value.data.data);
      }

      if (
        groupMarginRes.status === "fulfilled" &&
        groupMarginRes.value.data?.success
      ) {
        setGroupMargins(groupMarginRes.value.data.data || {});
      }

      let fetchedGroups =
        unifiedRes.status === "fulfilled" && unifiedRes.value.data?.success
          ? unifiedRes.value.data.data || []
          : [];

      // Exclude Umrah package groups from the all-groups listing.
      // Umrah packages should only appear on the dedicated Umrah packages page.
      fetchedGroups = fetchedGroups.filter((g) => !isUmrahPackageGroup(g));

      // Client-side filter by group type if a specific type is selected
      if (groupType) {
        const gtEntry = groupTypes.find((g) => g.value === groupType);
        fetchedGroups = fetchedGroups.filter((g) => {
          if (g.isOwnGroup) {
            if (!gtEntry?.ownGroupType) return true;
            if (g.type !== gtEntry?.ownGroupType) return false;

            // All own Umrah groups show ONLY under "Umrah Tickets" tab
            if (gtEntry.ownGroupType === "Umrah Groups") {
              return groupType === "Umrah Tickets";
            }

            return true;
          }

          if (groupType === "Umrah Tickets") {
            if (g.type === "UMRAH GROUP" && !isUmrahPackageGroup(g)) return true;
            return g.type === groupType;
          }

          if (groupType === "UMRAH GROUP") {
            return g.type === "UMRAH GROUP" && isUmrahPackageGroup(g);
          }

          return g.type === groupType;
        });
      }

      const uniqueAirlines = [
        ...new Set(
          fetchedGroups.map((g) => g.airline?.airline_name).filter(Boolean),
        ),
      ];
      const uniqueSectors = [
        ...new Set(
          fetchedGroups
            .map((g) => getEffectiveSector(g))
            .filter(Boolean),
        ),
      ];

      setAirlines(uniqueAirlines.sort());
      setSectors(uniqueSectors.sort());
      setAllGroups(fetchedGroups);
      applyFilters(fetchedGroups);
    } catch (err) {
      console.error("Error fetching groups:", err);
      toast.error("Failed to load groups");
      setAllGroups([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (dataToFilter = allGroups) => {
    let filtered = [...dataToFilter];

    if (filters.sectors.length > 0) {
      filtered = filtered.filter((g) =>
        filters.sectors.includes(getEffectiveSector(g)),
      );
    }
    if (filters.airlines.length > 0) {
      filtered = filtered.filter((g) =>
        filters.airlines.includes(g.airline?.airline_name),
      );
    }
    if (filters.durations.length > 0) {
      filtered = filtered.filter((g) => {
        const duration = getGroupDuration(g);
        const bucket = getDurationBucket(duration);
        return bucket && filters.durations.includes(bucket);
      });
    }
    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase();
      filtered = filtered.filter((g) => {
        const matchesSector = g.sector?.toLowerCase().includes(keyword);
        const matchesAirline = g.airline?.airline_name
          ?.toLowerCase()
          .includes(keyword);
        const matchesGroupName = g.groupName?.toLowerCase().includes(keyword);
        const matchesFlightNo = g.details?.some((flight) =>
          flight.flight_no?.toLowerCase().includes(keyword),
        );
        const matchesPnr = g.pnr?.toLowerCase().includes(keyword);
        return (
          matchesSector ||
          matchesAirline ||
          matchesGroupName ||
          matchesFlightNo ||
          matchesPnr
        );
      });
    }
    if (filters.departDate) {
      // Parse the selected date in local time to avoid timezone shifts
      const sd =
        filters.departDate instanceof Date
          ? filters.departDate
          : new Date(filters.departDate);
      const selYear = sd.getFullYear();
      const selMonth = sd.getMonth();
      const selDay = sd.getDate();

      filtered = filtered.filter((g) => {
        if (!g.dept_date) return false;
        // dept_date is always "YYYY-MM-DD" after normalization
        const [y, m, d] = String(g.dept_date)
          .slice(0, 10)
          .split("-")
          .map(Number);
        return y === selYear && m - 1 === selMonth && d === selDay;
      });
    }

    setGroups(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    if (filterType === "sector") {
      setFilters((prev) => ({
        ...prev,
        sectors: prev.sectors.includes(value)
          ? prev.sectors.filter((s) => s !== value)
          : [...prev.sectors, value],
      }));
    } else if (filterType === "airline") {
      setFilters((prev) => ({
        ...prev,
        airlines: prev.airlines.includes(value)
          ? prev.airlines.filter((a) => a !== value)
          : [...prev.airlines, value],
      }));
    } else if (filterType === "duration") {
      setFilters((prev) => ({
        ...prev,
        durations: prev.durations.includes(value)
          ? prev.durations.filter((d) => d !== value)
          : [...prev.durations, value],
      }));
    } else {
      setFilters((prev) => ({ ...prev, [filterType]: value }));
    }
  };

  const handleBookNow = (group) => {
    navigate("/dashboard/booking", { state: { groupData: group } });
  };

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, allGroups]);

  const LoadingSkeleton = () => (
    <div className="space-y-6 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="h-12 rounded-2xl bg-gray-200 mb-4 w-full" />
          <div className="h-16 bg-gray-100 rounded-xl mb-2 w-48 mx-auto" />
          {[1, 2].map((j) => (
            <div key={j} className="h-24 bg-gray-100 rounded-2xl mb-3" />
          ))}
        </div>
      ))}
    </div>
  );

  // Group by sector + airline — same sector with different airlines gets separate cards
  const sectorFirstSeen = {};
  const groupedData = groups.reduce((acc, group) => {
    const sector = getEffectiveSector(group) || "Unknown";
    const airlineName = group.airline?.airline_name || "";
    const key = `${sector}|||${airlineName}`;
    if (!(sector in sectorFirstSeen)) {
      sectorFirstSeen[sector] = Object.keys(sectorFirstSeen).length;
    }
    if (!acc[key]) {
      acc[key] = {
        airline: airlineName,
        airlineLogo: group.airline?.logo_url || null,
        sector,
        groups: [],
      };
    }
    acc[key].groups.push(group);
    return acc;
  }, {});

  // Sort cards: by sector order, then by airline name within the same sector, then by earliest dept_date
  const getMinDate = (card) => {
    const dates = card.groups
      .map((g) => g.dept_date)
      .filter(Boolean)
      .sort();
    return dates[0] || "9999-99-99";
  };
  const sortedGroupedEntries = Object.entries(groupedData).sort(
    ([, a], [, b]) => {
      const sectorOrderA = sectorFirstSeen[a.sector] ?? 999;
      const sectorOrderB = sectorFirstSeen[b.sector] ?? 999;
      if (sectorOrderA !== sectorOrderB) return sectorOrderA - sectorOrderB;
      // Same sector → sort by airline name, then by earliest departure
      if (a.airline !== b.airline) return a.airline.localeCompare(b.airline);
      return getMinDate(a).localeCompare(getMinDate(b));
    },
  );

  // Shared Filter UI Component for Sidebar and Mobile Drawer
  const FilterContent = () => (
    <>
      {currentGroupType === "Umrah Tickets" && (
        <>
          <h3
            className="font-semibold text-lg mb-4"
            style={{ color: theme.colors.textPrimary }}
          >
            Duration
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {PACKAGE_DURATION_BUCKETS.map((duration) => (
              <label
                key={duration}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition"
              >
                <input
                  type="checkbox"
                  checked={filters.durations.includes(duration)}
                  onChange={() => handleFilterChange("duration", duration)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-700">{duration} Days</span>
              </label>
            ))}
          </div>
          <div className="h-px bg-gray-200 my-6" />
        </>
      )}
      <h3
        className="font-semibold text-lg mb-4"
        style={{ color: theme.colors.textPrimary }}
      >
        Airlines
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
        {airlines.map((airline) => (
          <label
            key={airline}
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition"
          >
            <input
              type="checkbox"
              checked={filters.airlines.includes(airline)}
              onChange={() => handleFilterChange("airline", airline)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-700">{airline}</span>
          </label>
        ))}
      </div>
      <div className="h-px bg-gray-200 my-6" />
      <h3
        className="font-semibold text-lg mb-4"
        style={{ color: theme.colors.textPrimary }}
      >
        Sectors
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
        {sectors.map((sector) => (
          <label
            key={sector}
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition"
          >
            <input
              type="checkbox"
              checked={filters.sectors.includes(sector)}
              onChange={() => handleFilterChange("sector", sector)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-700">{sector}</span>
          </label>
        ))}
      </div>
    </>
  );

  return (
    <>
      <TopBar title={"Group Tickets"} />
      {/* Copy All Button (only in agent dashboard) */}
      {headerType === "dashboard" && (
        <div className="flex justify-end mb-2">
          <button
            onClick={handleCopyAll}
            disabled={groups.length === 0}
            title={
              groups.length === 0
                ? "No data available to copy"
                : "Copy all group data"
            }
            style={{
              background:
                groups.length === 0
                  ? "#d1d5db"
                  : copiedAll
                    ? "#22c55e"
                    : theme.colors.ublGradient,
              color: "white",
              opacity: groups.length === 0 ? 0.6 : 1,
              borderRadius: 8,
              minWidth: 120,
              fontWeight: 600,
              fontSize: 13,
              padding: "7px 18px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: groups.length === 0 ? "not-allowed" : "pointer",
            }}
            className="transition-all shadow-sm hover:shadow"
          >
            {copiedAll ? <FaCheck size={15} /> : <FaRegCopy size={15} />}
            {copiedAll ? "Copied!" : `Copy All (${groups.length})`}
          </button>
        </div>
      )}
      <div
        className="w-full min-h-screen"
        style={{ background: theme.colors.background }}
      >
        {/* Responsive Header Container */}
        <div
          className={`flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 py-2 ${headerType === "dashboard" ? "rounded-t-2xl" : ""}`}
        >
          <div className="w-full xl:w-auto">{header}</div>

          <div className="flex flex-col lg:flex-row items-center gap-2 w-full xl:w-auto">
            <div className="flex items-center justify-between w-full lg:w-auto gap-3">
              {/* Advanced Search Toggle */}
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showAdvancedSearch}
                    onChange={(e) => setShowAdvancedSearch(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className="w-9 h-5 rounded-full transition-all"
                    style={{
                      background: showAdvancedSearch
                        ? theme.colors.ublGradient
                        : "#d1d5db",
                    }}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${showAdvancedSearch ? "translate-x-4" : ""}`}
                    />
                  </div>
                </div>
                <span className="ml-2 text-xs font-medium text-gray-700 whitespace-nowrap">
                  Advanced Search
                </span>
              </label>

              {showAdvancedSearch && (
                <button
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden p-1.5 rounded-lg bg-gray-100 text-gray-700"
                >
                  <Menu size={16} />
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <div className="w-full sm:w-48">
                <MaskedDatePicker
                  value={filters.departDate}
                  onChange={(date) => handleFilterChange("departDate", date)}
                  placeholderText="Departure Date"
                  minDate={new Date()}
                  size="small"
                />
              </div>
              <div className="flex-1 lg:w-52 relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={filters.searchKeyword}
                  onChange={(e) =>
                    handleFilterChange("searchKeyword", e.target.value)
                  }
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 text-xs"
                />
                <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Filter Drawer Overlay */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsMobileFilterOpen(false)}
            />
            <div className="absolute right-0 top-0 h-full w-80 bg-white p-6 shadow-xl animate-in slide-in-from-right">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Filters</h2>
                <button onClick={() => setIsMobileFilterOpen(false)}>
                  <X />
                </button>
              </div>
              <FilterContent />
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 pt-3 pb-6">
          {/* Desktop Sidebar */}
          {showAdvancedSearch && (
            <div className="hidden lg:block w-56 shrink-0">
              <div className="bg-white rounded-2xl shadow-sm p-4 sticky top-6">
                <FilterContent />
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 space-y-3 overflow-hidden">
            {loading ? (
              <div className="bg-white rounded-3xl shadow-sm p-4">
                <LoadingSkeleton />
              </div>
            ) : groups.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
                No groups available at the moment
              </div>
            ) : (
              sortedGroupedEntries.map(([key, data]) => {
                const sectorParts = data.sector?.split("-") || [];
                const origin = sectorParts[0] || "";
                const destination =
                  sectorParts[sectorParts.length - 1] || data.sector;

                return (
                  <div
                    key={key}
                    className="rounded-2xl overflow-hidden bg-white border border-neutral-200"
                  >
                    {/* Sector Header Bar */}
                    <div className="bg-linear-to-r from-blue-50 via-transparent to-blue-50 flex justify-center items-center gap-6 py-2.5 border-b border-neutral-200 relative">
                      {/* Airline Logo Area */}
                      <div className="bg-white flex items-center justify-center border-b border-neutral-100">
                        {data.airlineLogo ? (
                          <img
                            style={{ height: "56px" }}
                            src={data.airlineLogo}
                            alt={data.airline}
                            className="object-contain"
                          />
                        ) : (
                          <span
                            className="font-semibold text-sm"
                            style={{ color: theme.colors.textPrimary }}
                          >
                            {data.airline}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-4 px-4 py-4">
                        <FaPlaneDeparture className="text-lg" />
                        <span className="font-bold text-lg tracking-widest uppercase">
                          {data.sector}
                        </span>
                      </div>

                      {/* Copy Sector Button (only in agent dashboard) */}
                      {headerType === "dashboard" && (
                        <button
                          onClick={() => handleCopySector(key, data.groups)}
                          title="Copy all data for this sector"
                          style={{
                            position: "absolute",
                            right: 16,
                            top: 12,
                            background: copiedSector[key]
                              ? "#22c55e"
                              : "#e5e7eb",
                            color: copiedSector[key] ? "white" : "#3b82f6",
                            borderRadius: 6,
                            fontWeight: 500,
                            fontSize: 12,
                            padding: "4px 10px",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            cursor: "pointer",
                            zIndex: 2,
                          }}
                          className="transition-all shadow-sm hover:shadow"
                        >
                          {copiedSector[key] ? (
                            <FaCheck size={13} />
                          ) : (
                            <FaRegCopy size={13} />
                          )}
                          {copiedSector[key] ? "Copied" : "Copy Sector"}
                        </button>
                      )}
                    </div>

                    {/* Flight Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr
                            className="text-white text-xs font-bold"
                            style={{
                              background:
                                "linear-gradient(90deg, #21397C 0%, #2CA3B4 100%)",
                            }}
                          >
                            <th className="px-4 py-2.5 text-left whitespace-nowrap">
                              Date
                            </th>
                            <th className="px-4 py-2.5 text-left whitespace-nowrap">
                              Flight
                            </th>
                            <th className="px-4 py-2.5 text-center whitespace-nowrap">
                              Sector
                            </th>
                            <th className="px-4 py-2.5 text-center whitespace-nowrap">
                              Bag
                            </th>
                            <th className="px-4 py-2.5 text-center whitespace-nowrap">
                              Meal
                            </th>
                            {data.groups.some((g) => getDisplayDetails(g).length > 1) && (
                              <th className="px-4 py-2.5 text-center whitespace-nowrap">
                                Days
                              </th>
                            )}
                            <th className="px-4 py-2.5 text-center whitespace-nowrap">
                              Seats
                            </th>
                            <th className="px-4 py-2.5 text-center whitespace-nowrap">
                              Fare
                            </th>
                            <th className="w-36 px-4 py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.groups
                            .sort((a, b) => {
                              const dateDiff =
                                new Date(a.dept_date) - new Date(b.dept_date);
                              if (dateDiff !== 0) return dateDiff;
                              return (a.price || 0) - (b.price || 0);
                            })
                            .map((group) => {
                              const displayDetails = getDisplayDetails(group);
                              const flight = displayDetails[0];
                              const lastFlight =
                                displayDetails[displayDetails.length - 1];
                              const isMultiLeg = displayDetails.length > 1;
                              // Check if any group in this card is multi-leg to show Days column
                              const hasMultiLeg = data.groups.some(
                                (g) => getDisplayDetails(g).length > 1,
                              );
                              // const legLabels = ["Departure", "Arrival"];

                              return (
                                <tr
                                  key={group.id}
                                  className="border-b border-gray-500 bg-white hover:bg-blue-50/30 transition-colors"
                                >   
                                  {/* Date */}
                                  <td className="px-4 py-3 text-xs font-medium text-gray-600 whitespace-nowrap align-top">
                                    {isMultiLeg ? (
                                      <div className="flex pt-3 flex-col divide-y divide-dashed divide-gray-700">
                                        {displayDetails.map((d, i) => {
                                          const rawDate = d.dep_date || d.flight_date;
                                          return (
                                            <div key={i} style={{color: 'black', fontFamily:'sans-serif'}} className={`font-black text-sm flex flex-col ${i > 0 ? "pt-2" : "pb-2"}`}>
                                              {/* <span className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${i === 0 ? "text-blue-500" : "text-orange-400"}`}>
                                                {legLabels[i] || `Leg ${i + 1}`}
                                              </span> */}
                                              <span>
                                                {rawDate ? new Date(rawDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : flight ? (
                                      <span className="font-black" style={{ fontFamily: 'sans-serif', color: 'black' }}>
                                        {new Date(flight.dep_date || flight.flight_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                      </span>
                                    ) : "—"}
                                  </td>

                                  {/* Flight + Airline */}
                                  <td className="px-4 py-3 align-top">
                                    {isMultiLeg ? (
                                      <div className="flex flex-col divide-y divide-dashed divide-gray-700">
                                        {displayDetails.map((d, i) => (
                                          <div key={i} className={`flex items-center gap-1.5 ${i > 0 ? "pt-2" : "pb-2"}`}>
                                            <FaPlane
                                              className="text-xs shrink-0"
                                              style={{ color: i === 0 ? theme.colors.ublGradientStart : "#f97316" }}
                                            />
                                            <div className="flex flex-col">
                                              <span className="font-bold text-sm whitespace-nowrap">
                                                {d.flight_no?.toUpperCase() || "—"}
                                              </span>
                                              {i === 0 && group.airline?.airline_name && (
                                                <span className="text-[10px] text-gray-900 whitespace-nowrap leading-tight">
                                                  {group.airline.airline_name}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : ( 
                                      <div className="flex items-center gap-1.5">
                                        <FaPlane className="text-xs shrink-0" style={{ color: theme.colors.ublGradientStart }} />
                                        <div className="flex flex-col">
                                          <span className="font-semibold text-sm whitespace-nowrap">
                                            {flight?.flight_no?.toUpperCase() || "—"}
                                          </span>
                                          {group.airline?.airline_name && (
                                            <span className="text-[10px] text-gray-900 whitespace-nowrap leading-tight">
                                              {group.airline.airline_name}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </td>

                                  {/* Sector */}
                                  <td className="px-4 py-3 align-top">
                                    {isMultiLeg ? (
                                      <div className="flex flex-col divide-y divide-dashed divide-gray-700">
                                        {displayDetails.map((d, i) => (
                                          <div key={i} className={`flex items-center justify-center gap-3 ${i > 0 ? "pt-2" : "pb-2"}`}>
                                            <div className="text-center">
                                              <div className="text-sm font-black" style={{ fontFamily: 'sans-serif' }}>{d.origin || "—"}</div>
                                              <div className="text-xs text-gray-500">{d.dept_time?.substring(0, 5) || "—"}</div>
                                            </div>
                                            <div className="flex items-center relative min-w-12 w-26 md:w-40">
                                              <div
                                                className="h-0.5 w-full"
                                                style={{ background: i === 0 ? theme.colors.ublGradient : "linear-gradient(90deg,#f97316,#fb923c)" }}
                                              />
                                              <div className="absolute left-1/2 -translate-x-1/2 bg-white px-0.5">
                                                <FaPlane
                                                  className="text-sm"
                                                  style={{ color: i === 0 ? theme.colors.ublGradientStart : "#f97316" }}
                                                />
                                              </div>
                                            </div>
                                            <div className="text-center">
                                              <div className="text-sm font-black" style={{ fontFamily: 'sans-serif' }}>{d.destination || "—"}</div>
                                              <div className="text-xs text-gray-500">{d.arv_time?.substring(0, 5) || "—"}</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center gap-3">
                                        <div className="text-center">
                                          <div className="text-sm sm:text-base font-black" style={{ fontFamily: 'sans-serif' }}>{origin}</div>
                                          <div className="text-xs text-gray-700 font-medium">{flight?.dept_time?.substring(0, 5) || "—"}</div>
                                        </div>
                                        <div className="flex items-center relative min-w-12 w-26 md:w-48">
                                          <div className="h-0.5 w-full" style={{ background: theme.colors.ublGradient }} />
                                          <div className="absolute left-1/2 -translate-x-1/2 bg-white px-0.5">
                                            <FaPlane className="text-sm" style={{ color: theme.colors.ublGradientStart }} />
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-sm sm:text-base font-black" style={{ fontFamily: 'sans-serif' }}>{destination}</div>
                                          <div className="text-xs text-gray-700 font-medium">{(lastFlight?.arv_time || flight?.arv_time)?.substring(0, 5) || "—"}</div>
                                        </div>
                                      </div>
                                    )}
                                  </td>

                                  {/* Bag */}
                                  <td className="px-4 py-3 text-center align-top">
                                    {isMultiLeg ? (
                                      <div className="flex flex-col divide-y divide-dashed divide-gray-700 items-center mt-3">
                                        {displayDetails.map((d, i) => (
                                          <div key={i} className={`${i > 0 ? "pt-2" : "pb-2"}`}>
                                            {d.baggage ? (
                                              <div className="inline-flex items-center gap-1 text-xs font-medium">
                                                <FaSuitcase className="shrink-0" style={{ color: i === 0 ? theme.colors.ublGradientStart : "#f97316" }} />
                                                <span>{formatBaggageLabel(d.baggage)}</span>
                                              </div>
                                            ) : (
                                              <span className="text-gray-400 text-xs">—</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      flight?.baggage ? (
                                        <div className="inline-flex items-center gap-1  text-xs font-medium">
                                          <FaSuitcase className="shrink-0" style={{ color: theme.colors.ublGradientStart }} />
                                          <span>{formatBaggageLabel(flight.baggage)}</span>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 text-xs">—</span>
                                      )
                                    )}
                                  </td>

                                  {/* Meal */}
                                  <td className="px-4 py-3 text-center align-top">
                                    {isMultiLeg ? (
                                      <div className="flex flex-col divide-y divide-dashed divide-gray-700 items-center mt-3">
                                        {displayDetails.map((d, i) => (
                                          <div key={i} className={`${i > 0 ? "pt-2" : "pb-2"}`}>
                                            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${d.meal && d.meal !== "No" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                              {d.meal && d.meal !== "No" ? "Yes" : "No"}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${flight?.meal && flight.meal !== "No" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                        {flight?.meal && flight.meal !== "No" ? "Yes" : "No"}
                                      </span>
                                    )}
                                  </td>

                                  {/* Days */}
                                  {hasMultiLeg && (
                                    <td className="px-4 py-3 text-center align-middle">
                                      {(() => {
                                        // Only show days for multi-leg flights
                                        if (!isMultiLeg) {
                                          return <span className="text-gray-400 text-xs">—</span>;
                                        }
                                        
                                        let days = group.days;
                                        if (displayDetails.length > 1) {
                                          const firstRaw = displayDetails[0].dep_date || displayDetails[0].flight_date;
                                          const lastRaw = displayDetails[displayDetails.length - 1].dep_date || displayDetails[displayDetails.length - 1].flight_date;
                                          if (firstRaw && lastRaw) {
                                            const diff = Math.round((new Date(lastRaw) - new Date(firstRaw)) / (1000 * 60 * 60 * 24));
                                            if (diff > 0) days = diff;
                                          }
                                        }
                                        return days > 0 ? (
                                          <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                                            {days}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400 text-xs">—</span>
                                        );
                                      })()}
                                    </td>
                                  )}

                                  {/* Seats */}
                                  <td className="px-4 py-3 text-center align-middle">
                                    {group.isOwnGroup ? (
                                      group.showSeat ? (
                                        <span className="text-sm font-bold" style={{ color: theme.colors.ublGradientStart }}>
                                          {group.available_no_of_pax}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 text-xs">—</span>
                                      )
                                    ) : (
                                      (() => {
                                        if (!flight) return <span className="text-sm font-bold" style={{ color: theme.colors.ublGradientStart }}>{group.available_no_of_pax}</span>;
                                        const key = `${flight.flight_no}_${new Date(flight.dep_date || flight.flight_date).toISOString().split("T")[0]}`;
                                        const booked = bookedSeatsMap[key] || 0;
                                        return (
                                          <span className="text-sm font-bold" style={{ color: theme.colors.ublGradientStart }}>
                                            {group.available_no_of_pax - booked}
                                          </span>
                                        );
                                      })()
                                    )}
                                  </td>

                                  {/* Fare */}
                                  <td className="px-4 py-3 text-center whitespace-nowrap align-middle">
                                    {user?.priceOnCall ? (
                                      <span className="text-sm font-bold text-red-500">On Call</span>
                                    ) : (
                                      <div className="text-lg font-black" style={{ color: theme.colors.ublGradientStart , fontFamily: 'sans-serif' }}>
                                        PKR {calculatePriceAfterMargin(group.price, group)?.toLocaleString()}
                                      </div>
                                    )}
                                  </td>

                                  {/* Action */}
                                  <td className="w-36 px-4 py-3 mt-6 flex flex-col items-center gap-2 align-middle">
                                    <button
                                      onClick={() => handleBookNow(group)}
                                      disabled={!user?.showHideButton}
                                      className="flex items-center justify-center gap-1.5 px-3 py-2 font-semibold text-xs transition-all shadow-sm hover:shadow active:scale-95 whitespace-nowrap"
                                      style={{
                                        borderRadius: "8px",
                                        background: user?.showHideButton
                                          ? theme.colors.ublGradient
                                          : "#e5e7eb",
                                        color: user?.showHideButton
                                          ? "white"
                                          : "#9ca3af",
                                        cursor: user?.showHideButton
                                          ? "pointer"
                                          : "not-allowed",
                                      }}
                                    >
                                      <Ticket size={13} />
                                      <span>Book Now</span>
                                    </button>
                                    {/* Copy Row Button (only in agent dashboard) */}
                                    {headerType === "dashboard" && (
                                      <button
                                        onClick={() => handleCopyRow(group)}
                                        title="Copy this flight/group data"
                                        style={{
                                          background: copiedRow[group.id]
                                            ? "#22c55e"
                                            : "#e5e7eb",
                                          color: copiedRow[group.id]
                                            ? "white"
                                            : "#3b82f6",
                                          borderRadius: 6,
                                          fontWeight: 500,
                                          fontSize: 12,
                                          padding: "4px 10px",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                          cursor: "pointer",
                                        }}
                                        className="transition-all shadow-sm hover:shadow"
                                      >
                                        {copiedRow[group.id] ? (
                                          <FaCheck size={13} />
                                        ) : (
                                          <FaRegCopy size={13} />
                                        )}
                                        {copiedRow[group.id]
                                          ? "Copied"
                                          : "Copy"}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
