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

export default function AllGroups({ headerType, header, searchParams, user }) {
        // Copy feedback state
        const [copiedAll, setCopiedAll] = useState(false);
        const [copiedRow, setCopiedRow] = useState({});
        // Build copy text for all groups (similar to admin dashboard)
        const buildCopyText = (groupsList) => {
            if (!groupsList.length) return "";
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const MONTHS_TITLE = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const header = `                *=====${String(today.getDate()).padStart(2, "0")} ${MONTHS_TITLE[today.getMonth()].toUpperCase()} UPDATES=====*`;
            const lines = groupsList.map((g) => {
                const d = g.details?.[0] || {};
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
                const depTime = (d.dept_time || d.dep_time || d.depTime || "").slice(0,5);
                const arvTime = (d.arv_time || d.arr_time || d.arrTime || "").slice(0,5);
                const depPart = depTime ? ` (${depTime})` : "";
                const arvPart = arvTime ? ` (${arvTime})` : "";
                const price = g.price || 0;
                return `${flightNo} *${dd} ${mon} ${year}* ${origin}${depPart} ${dest}${arvPart}..... *PKR ${price}*`;
            }).filter(Boolean);
            const footer = `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*\n=======================\nShaheen Wings Travels\nMobile: 0309-9802154\nAddress: MA Plaza Ground Floor Shop # 3, Kahror Pacca.\nPtcl: 0608340174\nWebsite: shaheenwings.com`;
            return [header, ...lines, "=======================", footer].join("\n");
        };

        // Build copy text for a single group/flight row (with footer)
        const buildRowCopyText = (group) => {
            const MONTHS_TITLE = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const d = group.details?.[0] || {};
            const rawDate = d.dep_date || d.flight_date || group.dept_date;
            if (!rawDate) return "";
            const date = new Date(rawDate);
            if (isNaN(date.getTime())) return "";
            const dd = String(date.getDate()).padStart(2, "0");
            const mon = MONTHS_TITLE[date.getMonth()];
            const year = date.getFullYear();
            const flightNo = (d.flight_no || d.flightNo || "").toUpperCase();
            const origin = d.origin || d.from || "";
            const dest = d.destination || d.to || "";
            const depTime = (d.dept_time || d.dep_time || d.depTime || "").slice(0,5);
            const arvTime = (d.arv_time || d.arr_time || d.arrTime || "").slice(0,5);
            const depPart = depTime ? ` (${depTime})` : "";
            const arvPart = arvTime ? ` (${arvTime})` : "";
            const price = group.price || 0;
            const footer = `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*\n=======================\nShaheen Wings Travels\nMobile: 0309-9802154\nAddress: MA Plaza Ground Floor Shop # 3, Kahror Pacca.\nPtcl: 0608340174\nWebsite: shaheenwings.com`;
            return `${flightNo} *${dd} ${mon} ${year}* ${origin}${depPart} ${dest}${arvPart}..... *PKR ${price}*\n=======================\n${footer}`;
        };

        // Build copy text for all groups in a sector (with footer)
        const buildSectorCopyText = (sectorGroups) => {
            if (!sectorGroups.length) return "";
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const MONTHS_TITLE = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const header = `                *=====${String(today.getDate()).padStart(2, "0")} ${MONTHS_TITLE[today.getMonth()].toUpperCase()} UPDATES=====*`;
            const lines = sectorGroups.map((g) => {
                const d = g.details?.[0] || {};
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
                const depTime = (d.dept_time || d.dep_time || d.depTime || "").slice(0,5);
                const arvTime = (d.arv_time || d.arr_time || d.arrTime || "").slice(0,5);
                const depPart = depTime ? ` (${depTime})` : "";
                const arvPart = arvTime ? ` (${arvTime})` : "";
                const price = g.price || 0;
                return `${flightNo} *${dd} ${mon} ${year}* ${origin}${depPart} ${dest}${arvPart}..... *PKR ${price}*`;
            }).filter(Boolean);
            const footer = `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*\n=======================\nShaheen Wings Travels\nMobile: 0309-9802154\nAddress: MA Plaza Ground Floor Shop # 3, Kahror Pacca.\nPtcl: 0608340174\nWebsite: shaheenwings.com`;
            return [header, ...lines, "=======================", footer].join("\n");
        };

        // Copy handler for sector
        const [copiedSector, setCopiedSector] = useState({});
        const handleCopySector = async (sectorKey, sectorGroups) => {
            const text = buildSectorCopyText(sectorGroups);
            try {
                await navigator.clipboard.writeText(text);
                setCopiedSector((prev) => ({ ...prev, [sectorKey]: true }));
                setTimeout(() => setCopiedSector((prev) => ({ ...prev, [sectorKey]: false })), 2000);
            } catch {
                const el = document.createElement('textarea');
                el.value = text;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
                setCopiedSector((prev) => ({ ...prev, [sectorKey]: true }));
                setTimeout(() => setCopiedSector((prev) => ({ ...prev, [sectorKey]: false })), 2000);
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
                const el = document.createElement('textarea');
                el.value = text;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
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
                setTimeout(() => setCopiedRow((prev) => ({ ...prev, [group.id]: false })), 2000);
            } catch {
                const el = document.createElement('textarea');
                el.value = text;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
                setCopiedRow((prev) => ({ ...prev, [group.id]: true }));
                setTimeout(() => setCopiedRow((prev) => ({ ...prev, [group.id]: false })), 2000);
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
    const [bookingList, setBookingList] = useState([]);
    const [bookedSeatsMap, setBookedSeatsMap] = useState({});

    const [filters, setFilters] = useState({
        sectors: [],
        airlines: [],
        searchKeyword: "",
        departDate: null,
    });

    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [airlines, setAirlines] = useState([]);
    const [sectors, setSectors] = useState([]);

    const calculateB2BPrice = (groupPrice, group = {}) => {
        if (!user) return groupPrice; // B2C case (handled separately)

        // If user has priceOnCall flag, return "Price on Call"
        if (user.priceOnCall) return null;

        let finalPrice = groupPrice;

        // Priority 1: Agent-specific margin (highest priority)
        const marginType = user.marginType; // "Percentage" or "Amount"
        const marginPercent = user.flightMarginPercent;
        const marginAmount = user.flightMarginAmount;

        if (marginType === "Percentage" && marginPercent > 0) {
            const marginValue = (groupPrice * marginPercent) / 100;
            finalPrice = groupPrice + marginValue;
        } else if (marginType === "Amount" && marginAmount > 0) {
            finalPrice = groupPrice + marginAmount;
        }

        // Priority 2: Individual group margin (admin-set per Sabaoon API group)
        // Only applied when no agent margin was set
        if (finalPrice === groupPrice) {
            const indMargin = group?.individualMargin;
            if (indMargin !== null && indMargin !== undefined) {
                finalPrice = groupPrice + indMargin;
            }
        }

        // Priority 3: Overall/global margin (fallback when neither agent nor individual margin applied)
        if (finalPrice === groupPrice && dbMargin) {
            if (dbMargin.type === "percent" && dbMargin.value > 0) {
                const marginValue = (groupPrice * dbMargin.value) / 100;
                finalPrice = groupPrice + marginValue;
            } else if (dbMargin.type === "amount" && dbMargin.value > 0) {
                finalPrice = groupPrice + dbMargin.value;
            }
        }

        return Math.round(finalPrice).toLocaleString(); // Round to nearest integer
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
                const key = `${flight.flightNo}_${new Date(flight.depDate)
                    .toISOString()
                    .split("T")[0]}`;

                // ignore cancelled if needed
                if (booking.status !== "cancelled") {
                    map[key] = (map[key] || 0) + passengersLength;
                }
            });
        });

        console.log("FINAL MAP:", map); // 👈 DEBUG THIS
        setBookedSeatsMap(map);
    };
    // console.log(bookings, "hello2222")
    const fetchGroups = async () => {
        try {
            setLoading(true);

            const groupType = searchParams.get("group_type") || "";

            // Single unified call (admin + sabaoon, sector-sorted, past-filtered) + margin in parallel
            const [unifiedRes, marginRes] = await Promise.allSettled([
                axiosInstance.get("/sector/getUnifiedGroups"),
                axiosInstance.get("/sector/getMargin"),
            ]);

            if (marginRes.status === "fulfilled" && marginRes.value.data?.success) {
                setDbMargin(marginRes.value.data.data);
            }

            let fetchedGroups =
                unifiedRes.status === "fulfilled" && unifiedRes.value.data?.success
                    ? unifiedRes.value.data.data || []
                    : [];

            // Client-side filter by group type if a specific type is selected
            if (groupType) {
                const gtEntry = groupTypes.find((g) => g.value === groupType);
                fetchedGroups = fetchedGroups.filter((g) => {
                    if (g.isOwnGroup) {
                        return gtEntry?.ownGroupType ? g.type === gtEntry.ownGroupType : true;
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
                        .map((g) => (g.sector || "").toUpperCase().trim())
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
                filters.sectors.includes((g.sector || "").toUpperCase().trim()),
            );
        }
        if (filters.airlines.length > 0) {
            filtered = filtered.filter((g) =>
                filters.airlines.includes(g.airline?.airline_name),
            );
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
                return matchesSector || matchesAirline || matchesGroupName || matchesFlightNo || matchesPnr;
            });
        }
        if (filters.departDate) {
            // Parse the selected date in local time to avoid timezone shifts
            const sd = filters.departDate instanceof Date
                ? filters.departDate
                : new Date(filters.departDate);
            const selYear = sd.getFullYear();
            const selMonth = sd.getMonth();
            const selDay = sd.getDate();

            filtered = filtered.filter((g) => {
                if (!g.dept_date) return false;
                // dept_date is always "YYYY-MM-DD" after normalization
                const [y, m, d] = String(g.dept_date).slice(0, 10).split("-").map(Number);
                return y === selYear && (m - 1) === selMonth && d === selDay;
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

    // Track the first time each sector is encountered (preserves backend sector-order)
    const sectorFirstSeen = {};
    const groupedData = groups.reduce((acc, group) => {
        const airlineName = group.airline?.airline_name || "Unknown";
        const sector = (group.sector || "Unknown").toUpperCase().trim();
        const key = `${airlineName}-${sector}`;
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

    // Sort cards: preserve sector order from backend, then sort same-sector cards by earliest dept_date
    const getMinDate = (card) => {
        const dates = card.groups.map((g) => g.dept_date).filter(Boolean).sort();
        return dates[0] || "9999-99-99";
    };
    const sortedGroupedEntries = Object.entries(groupedData).sort(([, a], [, b]) => {
        const sectorOrderA = sectorFirstSeen[a.sector] ?? 999;
        const sectorOrderB = sectorFirstSeen[b.sector] ?? 999;
        if (sectorOrderA !== sectorOrderB) return sectorOrderA - sectorOrderB;
        // Same sector → card with earliest departure first
        return getMinDate(a).localeCompare(getMinDate(b));
    });

    // Shared Filter UI Component for Sidebar and Mobile Drawer
    const FilterContent = () => (
        <>
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
            {headerType === 'dashboard' && (
                <div className="flex justify-end mb-2">
                    <button
                        onClick={handleCopyAll}
                        disabled={groups.length === 0}
                        title={groups.length === 0 ? "No data available to copy" : "Copy all group data"}
                        style={{
                            background: groups.length === 0 ? '#d1d5db' : copiedAll ? '#22c55e' : theme.colors.ublGradient,
                            color: 'white',
                            opacity: groups.length === 0 ? 0.6 : 1,
                            borderRadius: 8,
                            minWidth: 120,
                            fontWeight: 600,
                            fontSize: 13,
                            padding: '7px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            cursor: groups.length === 0 ? 'not-allowed' : 'pointer',
                        }}
                        className="transition-all shadow-sm hover:shadow"
                    >
                        {copiedAll ? <FaCheck size={15} /> : <FaRegCopy size={15} />}
                        {copiedAll ? 'Copied!' : `Copy All (${groups.length})`}
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
                                const destination = sectorParts[sectorParts.length - 1] || data.sector;

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

                                            <div
                                                className="flex items-center justify-center gap-4 px-4 py-4"
                                            >
                                                <FaPlaneDeparture className="text-lg" />
                                                <span className="font-bold text-lg tracking-widest uppercase">
                                                    {data.sector}
                                                </span>
                                            </div>

                                            {/* Copy Sector Button (only in agent dashboard) */}
                                            {headerType === 'dashboard' && (
                                                <button
                                                    onClick={() => handleCopySector(key, data.groups)}
                                                    title="Copy all data for this sector"
                                                    style={{
                                                        position: 'absolute',
                                                        right: 16,
                                                        top: 12,
                                                        background: copiedSector[key] ? '#22c55e' : '#e5e7eb',
                                                        color: copiedSector[key] ? 'white' : '#3b82f6',
                                                        borderRadius: 6,
                                                        fontWeight: 500,
                                                        fontSize: 12,
                                                        padding: '4px 10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        cursor: 'pointer',
                                                        zIndex: 2,
                                                    }}
                                                    className="transition-all shadow-sm hover:shadow"
                                                >
                                                    {copiedSector[key] ? <FaCheck size={13} /> : <FaRegCopy size={13} />}
                                                    {copiedSector[key] ? 'Copied' : 'Copy Sector'}
                                                </button>
                                            )}
                                        </div>

                                        {/* Flight Table */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="text-white text-xs font-bold" style={{ background: "linear-gradient(90deg, #21397C 0%, #2CA3B4 100%)" }}>
                                                        <th className="px-4 py-2.5 text-left whitespace-nowrap">Date</th>
                                                        <th className="px-4 py-2.5 text-left whitespace-nowrap">Flight</th>
                                                        <th className="px-4 py-2.5 text-center whitespace-nowrap">Sector</th>
                                                        <th className="px-4 py-2.5 text-center whitespace-nowrap">Bag</th>
                                                        <th className="px-4 py-2.5 text-center whitespace-nowrap">Meal</th>
                                                        <th className="px-4 py-2.5 text-center whitespace-nowrap">Seats</th>
                                                        <th className="px-4 py-2.5 text-center whitespace-nowrap">Fare</th>
                                                        <th className="w-36 px-4 py-2.5"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.groups
                                                        .sort((a, b) => {
                                                            const dateDiff = new Date(a.dept_date) - new Date(b.dept_date);
                                                            if (dateDiff !== 0) return dateDiff;
                                                            return (a.price || 0) - (b.price || 0);
                                                        })
                                                        .map((group) => {
                                                            const flight = group.details?.[0];
                                                            const lastFlight = group.details?.[group.details.length - 1];
                                                            return (
                                                                <tr key={group.id} className="border-b border-gray-100 bg-white hover:bg-blue-50/40 transition-colors">
                                                                    {/* Date */}
                                                                    <td className="px-4 py-3 text-xs font-medium text-gray-600 whitespace-nowrap">
                                                                        {flight
                                                                            ? new Date(flight.dep_date || flight.flight_date).toLocaleDateString("en-GB", {
                                                                                day: "2-digit",
                                                                                month: "short",
                                                                                year: "numeric",
                                                                            })
                                                                            : "—"}
                                                                    </td>

                                                                    {/* Flight */}
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <FaPlane className="text-xs shrink-0" style={{ color: theme.colors.ublGradientStart }} />
                                                                            <span className="font-semibold text-sm whitespace-nowrap">
                                                                                {flight?.flight_no?.toUpperCase() || "—"}
                                                                            </span>
                                                                        </div>
                                                                    </td>

                                                                    {/* Sector with route + time UI */}
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-center justify-center gap-3">
                                                                            <div className="text-center">
                                                                                <div className="text-sm sm:text-base font-bold">{origin}</div>
                                                                                <div className="text-xs text-gray-500 font-medium">
                                                                                    {flight?.dept_time?.substring(0, 5) || "—"}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center relative min-w-12 w-26 md:w-48">
                                                                                <div className="h-0.5 w-full" style={{ background: theme.colors.ublGradient }} />
                                                                                <div className="absolute left-1/2 -translate-x-1/2 bg-white px-0.5">
                                                                                    <FaPlane className="text-sm" style={{ color: theme.colors.ublGradientStart }} />
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <div className="text-sm sm:text-base font-bold">{destination}</div>
                                                                                <div className="text-xs text-gray-500 font-medium">
                                                                                    {(lastFlight?.arv_time || flight?.arv_time)?.substring(0, 5) || "—"}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>

                                                                    {/* Bag */}
                                                                    <td className="px-4 py-3 text-center">
                                                                        {flight?.baggage ? (
                                                                            <div className="inline-flex items-center gap-1 text-xs font-medium">
                                                                                <FaSuitcase className="shrink-0" style={{ color: theme.colors.ublGradientStart }} />
                                                                                <span>{flight.baggage}KG</span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-gray-400 text-xs">—</span>
                                                                        )}
                                                                    </td>

                                                                    {/* Meal */}
                                                                    <td className="px-4 py-3 text-center">
                                                                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${flight?.meal && flight.meal !== "No" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                                                            {flight?.meal && flight.meal !== "No" ? "Yes" : "No"}
                                                                        </span>
                                                                    </td>

                                                                    {/* Seats */}
                                                                    <td className="px-4 py-3 text-center">
                                                                        {group.isOwnGroup ? (
                                                                            group.showSeat ? (
                                                                                <div className="flex flex-col items-center">
                                                                                    <span
                                                                                        className="text-sm font-bold"
                                                                                        style={{ color: theme.colors.ublGradientStart }}
                                                                                    >
                                                                                        {group.available_no_of_pax}
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-gray-400 text-xs">—</span>
                                                                            )
                                                                        ) : (
                                                                            <div className="flex flex-col items-center">
                                                                                {(() => {
                                                                                    if (!flight) return group.available_no_of_pax;

                                                                                    const key = `${flight.flight_no}_${new Date(
                                                                                        flight.dep_date || flight.flight_date
                                                                                    )
                                                                                        .toISOString()
                                                                                        .split("T")[0]}`;

                                                                                    const booked = bookedSeatsMap[key] || 0;

                                                                                    return (
                                                                                        <>
                                                                                            <span
                                                                                                className="text-sm font-bold"
                                                                                                style={{ color: theme.colors.ublGradientStart }}
                                                                                            >
                                                                                                {group.available_no_of_pax - booked}
                                                                                            </span>

                                                                                            {booked > 0 && (
                                                                                                <span className="text-xs text-orange-500 font-medium">
                                                                                                </span>
                                                                                            )}
                                                                                        </>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        )}
                                                                    </td>

                                                                    {/* Fare */}
                                                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                                                        {user?.priceOnCall ? (
                                                                            <span className="text-sm font-bold text-red-500">On Call</span>
                                                                        ) : (
                                                                            <>
                                                                                <div className="text-sm font-bold" style={{ color: theme.colors.ublGradientStart }}>
                                                                                    PKR {calculateB2BPrice(group.price, group)}
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </td>

                                                                    {/* Action */}
                                                                    <td className="w-36 px-4 py-3 flex flex-col items-center gap-2">
                                                                        <button
                                                                            onClick={() => handleBookNow(group)}
                                                                            disabled={!user?.showHideButton}
                                                                            className="flex items-center justify-center gap-1.5 px-3 py-2 font-semibold text-xs transition-all shadow-sm hover:shadow active:scale-95 whitespace-nowrap"
                                                                            style={{
                                                                                borderRadius: "8px",
                                                                                background: user?.showHideButton ? theme.colors.ublGradient : "#e5e7eb",
                                                                                color: user?.showHideButton ? "white" : "#9ca3af",
                                                                                cursor: user?.showHideButton ? "pointer" : "not-allowed",
                                                                            }}
                                                                        >
                                                                            <Ticket size={13} />
                                                                            <span>Book Now</span>
                                                                        </button>
                                                                        {/* Copy Row Button (only in agent dashboard) */}
                                                                        {headerType === 'dashboard' && (
                                                                            <button
                                                                                onClick={() => handleCopyRow(group)}
                                                                                title="Copy this flight/group data"
                                                                                style={{
                                                                                    background: copiedRow[group.id] ? '#22c55e' : '#e5e7eb',
                                                                                    color: copiedRow[group.id] ? 'white' : '#3b82f6',
                                                                                    borderRadius: 6,
                                                                                    fontWeight: 500,
                                                                                    fontSize: 12,
                                                                                    padding: '4px 10px',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: 6,
                                                                                    cursor: 'pointer',
                                                                                }}
                                                                                className="transition-all shadow-sm hover:shadow"
                                                                            >
                                                                                {copiedRow[group.id] ? <FaCheck size={13} /> : <FaRegCopy size={13} />}
                                                                                {copiedRow[group.id] ? 'Copied' : 'Copy'}
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