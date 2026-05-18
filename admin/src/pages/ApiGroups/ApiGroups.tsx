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
    { key: "umrah", label: "Umrah" },
    { key: "uk", label: "UK" },
];

// Maps the normalized flight type back to a category key
const TYPE_TO_CATEGORY: Record<string, string> = {
    "UAE ONE WAY GROUP": "uae",
    "ONE WAY GROUP": "ksa",
    "OMAN ONE WAY GROUP": "muscat",
    "UMRAH GROUP": "umrah",
    "UK ONE WAY GROUP": "uk",
};

// const getSourceLabel = (source?: string) => {
//     if (source === "travel-network") return "Travel Network";
//     if (source === "abidairtravel") return "AbidAir Travels";
//     if (source === "al-haider") return "Al-Haider";
//     return source || "Unknown";
// };

// const getSourceBadgeClass = (source?: string) => {
//     if (source === "travel-network") {
//         return "bg-amber-100 text-amber-700 border-amber-200";
//     }

//     if (source === "abidairtravel") {
//         return "bg-purple-100 text-purple-700 border-purple-200";
//     }

//     return "bg-emerald-100 text-emerald-700 border-emerald-200";
// };

const getCategoryFromGroup = (group: { type?: string }): string =>
    TYPE_TO_CATEGORY[group.type || ""] || "other";

const PlaneSVG = ({ className = "" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
        <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
);

const SuitcaseSVG = ({ className = "" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
        <path d="M20 7h-3V6a3 3 0 0 0-3-3H10a3 3 0 0 0-3 3v1H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM9 6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H9V6zm11 14H4V9h16v11z" />
    </svg>
);

const RefreshSVG = ({ className = "" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="1em" height="1em">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

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
}

interface GroupedEntry {
    airline: string;
    airlineLogo: string | null;
    sector: string;
    groups: ApiGroup[];
}

export default function ApiGroups() {
    const [searchParams] = useSearchParams();
    const [groups, setGroups] = useState<ApiGroup[]>([]);
    const [loading, setLoading] = useState(true);

    // ── Margin State ─────────────────────────────
    const [currentMargin, setCurrentMargin] = useState<{
        value: number;
        type: "percent" | "amount";
    } | null>(null);

    // ── Per-group margin overrides: overrideKey → { marginAmount, note } ──
    const [groupMargins, setGroupMargins] = useState<
        Record<string, { marginAmount: number; note: string }>
    >({});

    // ── Group-margin modal state ──────────────────
    const [marginModal, setMarginModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(""); // category key: "uae", "ksa", etc.
    const [modalAmount, setModalAmount] = useState("");
    const [modalNote, setModalNote] = useState("");
    const [modalSaving, setModalSaving] = useState(false);
    const amountInputRef = useRef<HTMLInputElement>(null);

    const activeCategory = searchParams.get("category") || "all";

    const activeCategoryLabel =
        API_GROUP_CATEGORIES.find((item) => item.key === activeCategory)?.label || "All Groups";

    // ── Fetch Groups ─────────────────────────────

    const fetchGroups = async () => {
        try {
            setLoading(true);

            const [alHaiderRes, travelNetRes, abidAirRes] = await Promise.allSettled([
                axiosInstance.get("/al-haider/available-bookings-by-group", {
                    params: activeCategory === "all" ? {} : { category: activeCategory },
                }),
                axiosInstance.get("/sabaoon/admin-groups"),
                axiosInstance.get("/abidair/available-bookings-by-group"),
            ]);

            const alHaiderGroups: ApiGroup[] =
                alHaiderRes.status === "fulfilled" && alHaiderRes.value.data?.success
                    ? (alHaiderRes.value.data.data || []).map((g: ApiGroup) => ({ ...g, source: g.source || "al-haider" }))
                    : [];

            const travelNetGroups: ApiGroup[] =
                travelNetRes.status === "fulfilled" && travelNetRes.value.data?.success
                    ? (travelNetRes.value.data.data || []).map((g: ApiGroup) => ({ ...g, source: g.source || "travel-network" }))
                    : [];

            const abidAirGroups: ApiGroup[] =
                abidAirRes.status === "fulfilled" && abidAirRes.value.data?.success
                    ? (abidAirRes.value.data.data || []).map((g: ApiGroup) => ({ ...g, source: g.source || "abidairtravel" }))
                    : [];

            let merged = [...alHaiderGroups, ...travelNetGroups, ...abidAirGroups];

            // Apply category filter client-side for travel-network and abidair
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

    // ── Fetch Margin ─────────────────────────────

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

    useEffect(() => {
        fetchGroups();
        fetchMargin();
        fetchGroupMargins();
    }, [activeCategory]);

    // ── Fetch per-group margin overrides ─────────
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

    // ── Calculate Margin ─────────────────────────

    /** Returns the margin PKR amount for a given group.
     *  Priority: category-level → sector-level → per-flight → global margin */
    const getEffectiveMarginAmount = (group: ApiGroup) => {
        // 1. Category-level override (e.g. "group-category-uae")
        const cat = getCategoryFromGroup(group);
        const catKey = `group-category-${cat}`;
        if (groupMargins[catKey]) return groupMargins[catKey].marginAmount;

        // 2. Sector-level override (backwards compat)
        const sectorKey = `sector-sector:${(group.sector || "").toUpperCase().trim()}`;
        if (groupMargins[sectorKey]) return groupMargins[sectorKey].marginAmount;

        // 3. Per-flight override
        const flightKey = `${group.source}-${group.id}`;
        if (groupMargins[flightKey]) return groupMargins[flightKey].marginAmount;

        // 4. Global margin fallback
        if (!currentMargin || !currentMargin.value) return 0;
        const basePrice = group.price || 0;
        if (currentMargin.type === "percent") {
            return Math.round((basePrice * currentMargin.value) / 100);
        }
        return currentMargin.value;
    };

    // ── Category margin helpers ───────────────────
    const categoryHasOverride = (catKey: string) =>
        !!groupMargins[`group-category-${catKey}`];

    const categoryOverrideAmount = (catKey: string) =>
        groupMargins[`group-category-${catKey}`]?.marginAmount ?? null;

    // ── Open / close modal ────────────────────────
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

    // When a group category is chosen in the modal, pre-fill existing override amount
    const handleGroupSelect = (catKey: string) => {
        setSelectedGroup(catKey);
        const existing = groupMargins[`group-category-${catKey}`];
        setModalAmount(existing ? String(existing.marginAmount) : "");
        setModalNote(existing?.note || "");
        setTimeout(() => amountInputRef.current?.focus(), 80);
    };

    // ── Save category-level margin ────────────────
    const handleSaveMargin = async () => {
        if (!selectedGroup) {
            toast.error("Please select a group first");
            return;
        }
        const amount = parseFloat(modalAmount);
        if (isNaN(amount) || amount < 0) {
            toast.error("Please enter a valid margin amount (>= 0)");
            return;
        }

        setModalSaving(true);
        try {
            // source="group-category", groupId="uae" → backend key "group-category-uae"
            await axiosInstance.post("/group-margin/set", {
                groupId: selectedGroup,
                source: "group-category",
                marginAmount: amount,
                note: modalNote,
            });

            const label = API_GROUP_CATEGORIES.find((c) => c.key === selectedGroup)?.label || selectedGroup.toUpperCase();
            toast.success(`Margin PKR ${amount.toLocaleString()} applied to all ${label} flights`);
            closeMarginModal();
            fetchGroupMargins();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to save margin");
        } finally {
            setModalSaving(false);
        }
    };

    // ── Clear category-level margin ───────────────
    const handleClearGroupMargin = async (catKey: string) => {
        const label = API_GROUP_CATEGORIES.find((c) => c.key === catKey)?.label || catKey.toUpperCase();
        if (!confirm(`Clear custom margin for all ${label} flights?`)) return;
        try {
            // DELETE /:source/:groupId  →  source="group-category"  groupId="uae"
            await axiosInstance.delete(`/group-margin/group-category/${encodeURIComponent(catKey)}`);
            toast.success(`Margin cleared for all ${label} flights`);
            fetchGroupMargins();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to clear margin");
        }
    };

    // ── Group by sector only (so same sector from different APIs merges into one card) ──

    const groupedData = groups.reduce<Record<string, GroupedEntry>>((acc, group) => {
        const sector = (group.sector || "Unknown").toUpperCase().trim();
        const key = sector;

        if (!acc[key]) {
            // Use the first group's airline for the card header logo
            acc[key] = {
                airline: group.airline?.airline_name || "",
                airlineLogo: group.airline?.logo_url || null,
                sector,
                groups: [],
            };
        } else if (!acc[key].airlineLogo && group.airline?.logo_url) {
            // Upgrade header logo if we find one later
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

    return (
        <>
            <PageMeta
                title={`${activeCategoryLabel} API Groups | Admin`}
                description="View API group flights (Al-Haider & Travel Network)"
            />

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 min-h-screen">

                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                            {activeCategoryLabel} API Groups
                        </h1>
                    </div>

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

                {/* Categories */}
                <div className="mb-6 flex flex-wrap gap-3">
                    {API_GROUP_CATEGORIES.map((category) => {
                        const target = category.key === "all"
                            ? "/api-groups"
                            : `/api-groups?category=${encodeURIComponent(category.key)}`;

                        return (
                            <Link
                                key={category.key}
                                to={target}
                                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${activeCategory === category.key
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                    }`}
                            >
                                {category.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Active group-category margin banners */}
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

                {/* Margin Banner */}
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

                {/* Content */}
                {loading ? (
                    <LoadingSkeleton />
                ) : groups.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        No {activeCategoryLabel.toLowerCase()} groups returned from API
                    </div>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(groupedData).map(([key, data]) => {
                            const sectorParts = data.sector?.split("-") || [];
                            const origin = sectorParts[0] || "";
                            const destination = sectorParts[sectorParts.length - 1] || data.sector;

                            return (
                                <div
                                    key={key}
                                    className="rounded-2xl overflow-hidden border border-neutral-200"
                                >
                                    {/* Sector card header with margin badge + clear button */}
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
                                                </div>
                                            );
                                        })()}

                                    </div>

                                    {/* Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr
                                                    className="text-white text-xs font-bold"
                                                    style={{
                                                        background: "linear-gradient(90deg, #21397C 0%, #2CA3B4 100%)"
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

                                                    {/* NEW */}
                                                    <th className="px-4 py-2.5 text-center whitespace-nowrap">
                                                        Base Price
                                                    </th>

                                                    <th className="px-4 py-2.5 text-center whitespace-nowrap">
                                                        Margin
                                                    </th>

                                                    <th className="px-4 py-2.5 text-center whitespace-nowrap">
                                                        Final Price
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {data.groups
                                                    .slice()
                                                    .sort((a, b) => {
                                                        const da = a.dept_date || a.details?.[0]?.dep_date || "";
                                                        const db = b.dept_date || b.details?.[0]?.dep_date || "";
                                                        if (da && db) return new Date(da).getTime() - new Date(db).getTime();
                                                        return da.localeCompare(db);
                                                    })
                                                    .map((group) => {

                                                        const id = String(group.id);
                                                        const details = group.details || [];
                                                        const flight = details[0];
                                                        const isMultiLeg = details.length > 1;

                                                        const basePrice = group.price || 0;

                                                        const marginAmount =
                                                            getEffectiveMarginAmount(group);

                                                        const finalPrice = basePrice + marginAmount;

                                                        const overrideKey = `${group.source}-${group.id}`;
                                                        const groupCat = getCategoryFromGroup(group);
                                                        const hasOverride = categoryHasOverride(groupCat) || !!groupMargins[overrideKey];

                                                        return (
                                                            <tr
                                                                key={id}
                                                                className={`border-b border-gray-100 transition-colors ${categoryHasOverride(groupCat)
                                                                    ? "bg-orange-50/40 hover:bg-orange-50"
                                                                    : "bg-white hover:bg-blue-50/40"
                                                                    }`}
                                                            >
                                                                {/* Date */}
                                                                <td className="px-4 py-3 text-xs font-medium text-gray-600 align-top">
                                                                    {isMultiLeg ? (
                                                                        <div className="flex flex-col divide-y divide-dashed divide-gray-300">
                                                                            {details.map((d, i) => {
                                                                                const rawDate = d.dep_date || d.flight_date;
                                                                                return (
                                                                                    <div key={i} className={`font-bold text-xs whitespace-nowrap ${i > 0 ? "pt-2" : "pb-2"}`}>
                                                                                        {rawDate ? new Date(rawDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="font-bold whitespace-nowrap">
                                                                            {flight ? new Date(flight.flight_date || flight.dep_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                                                        </span>
                                                                    )}
                                                                </td>

                                                                {/* Flight */}
                                                                <td className="px-4 py-3 align-top">
                                                                    {isMultiLeg ? (
                                                                        <div className="flex flex-col divide-y divide-dashed divide-gray-300">
                                                                            {details.map((d, i) => (
                                                                                <div key={i} className={`flex items-center gap-1.5 ${i > 0 ? "pt-2" : "pb-2"}`}>
                                                                                    <PlaneSVG className={`text-xs shrink-0 ${i === 0 ? "text-blue-500" : "text-orange-400"}`} />
                                                                                    <span className="font-semibold text-sm whitespace-nowrap">
                                                                                        {d.flight_no?.toUpperCase() || "—"}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <PlaneSVG className="text-xs text-blue-500 shrink-0" />
                                                                            <span className="font-semibold text-sm whitespace-nowrap">
                                                                                {flight?.flight_no || "—"}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </td>

                                                                {/* Airline */}
                                                                <td className="px-4 py-3 whitespace-nowrap align-top">
                                                                    {group.airline?.logo_url ? (
                                                                        <img
                                                                            src={group.airline.logo_url}
                                                                            alt={group.airline.airline_name || ""}
                                                                            style={{ height: "28px" }}
                                                                            className="object-contain"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-xs font-medium text-gray-700">
                                                                            {group.airline?.airline_name || group.airline?.short_name || "—"}
                                                                        </span>
                                                                    )}
                                                                </td>

                                                                {/* Source */}
                                                                <td className="px-4 py-3 align-top">
                                                                    <span
                                                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${group.source === "travel-network"
                                                                                ? "bg-amber-100 text-amber-700 border-amber-200"
                                                                                : group.source === "abidairtravel"
                                                                                    ? "bg-purple-100 text-purple-700 border-purple-200"
                                                                                    : "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                                            }`}
                                                                    >
                                                                        {group.source === "travel-network"
                                                                            ? "Travel Network"
                                                                            : group.source === "abidairtravel"
                                                                                ? "AbidAir Travels"
                                                                                : "Al-Haider"}
                                                                    </span>
                                                                </td>

                                                                {/* Sector */}
                                                                <td className="px-4 py-3 align-top">
                                                                    {isMultiLeg ? (
                                                                        <div className="flex flex-col divide-y divide-dashed divide-gray-300">
                                                                            {details.map((d, i) => (
                                                                                <div key={i} className={`flex items-center justify-center gap-2 ${i > 0 ? "pt-2" : "pb-2"}`}>
                                                                                    <div className="text-center">
                                                                                        <div className="text-sm font-black">{d.origin || "—"}</div>
                                                                                        <div className="text-xs text-gray-500">{d.dept_time?.substring(0, 5) || "—"}</div>
                                                                                    </div>
                                                                                    <div className="flex items-center relative min-w-8 w-14">
                                                                                        <div className={`h-0.5 w-full ${i === 0 ? "bg-blue-400" : "bg-orange-400"}`} />
                                                                                        <div className="absolute left-1/2 -translate-x-1/2 bg-white px-0.5">
                                                                                            <PlaneSVG className={`text-xs ${i === 0 ? "text-blue-500" : "text-orange-400"}`} />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-center">
                                                                                        <div className="text-sm font-black">{d.destination || "—"}</div>
                                                                                        <div className="text-xs text-gray-500">{d.arv_time?.substring(0, 5) || "—"}</div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center justify-center gap-3">
                                                                            <div className="text-center">
                                                                                <div className="text-sm font-bold">{origin}</div>
                                                                                <div className="text-xs text-gray-500 font-medium">
                                                                                    {flight?.dept_time?.substring(0, 5) || "—"}
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex items-center relative min-w-10 w-16">
                                                                                <div className="h-0.5 w-full bg-blue-400" />
                                                                                <div className="absolute left-1/2 -translate-x-1/2 bg-white px-0.5">
                                                                                    <PlaneSVG className="text-xs text-blue-500" />
                                                                                </div>
                                                                            </div>

                                                                            <div className="text-center">
                                                                                <div className="text-sm font-bold">{destination}</div>
                                                                                <div className="text-xs text-gray-500 font-medium">
                                                                                    {(group.details?.[group.details.length - 1]?.arv_time || flight?.arv_time)?.substring(0, 5) || "—"}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </td>

                                                                {/* Baggage */}
                                                                <td className="px-4 py-3 text-center align-top">
                                                                    {isMultiLeg ? (
                                                                        <div className="flex flex-col divide-y divide-dashed divide-gray-300 items-center">
                                                                            {details.map((d, i) => (
                                                                                <div key={i} className={`${i > 0 ? "pt-2" : "pb-2"}`}>
                                                                                    {d.baggage ? (
                                                                                        <div className="inline-flex items-center gap-1 text-xs font-medium">
                                                                                            <SuitcaseSVG className={`text-xs shrink-0 ${i === 0 ? "text-blue-500" : "text-orange-400"}`} />
                                                                                            <span>{d.baggage}KG</span>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="text-gray-400 text-xs">—</span>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        flight?.baggage ? (
                                                                            <div className="inline-flex items-center gap-1 text-xs font-medium">
                                                                                <SuitcaseSVG className="text-xs text-blue-500 shrink-0" />
                                                                                <span>{flight.baggage}KG</span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-gray-400 text-xs">—</span>
                                                                        )
                                                                    )}
                                                                </td>

                                                                {/* Meal */}
                                                                <td className="px-4 py-3 text-center align-top">
                                                                    {isMultiLeg ? (
                                                                        <div className="flex flex-col divide-y divide-dashed divide-gray-300 items-center">
                                                                            {details.map((d, i) => (
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

                                                                {/* Seats */}
                                                                <td className="px-4 py-3 text-center whitespace-nowrap align-top">
                                                                    <span className="text-sm font-bold text-gray-800">
                                                                        {group.available_no_of_pax}
                                                                    </span>
                                                                </td>

                                                                {/* Price Details */}
                                                                {/* Base Price */}
                                                                <td className="px-4 py-3 text-center whitespace-nowrap align-top">
                                                                    <div className="text-sm font-semibold text-blue-600">
                                                                        PKR {basePrice.toLocaleString()}
                                                                    </div>
                                                                </td>

                                                                {/* Margin */}
                                                                <td className="px-4 py-3 text-center whitespace-nowrap align-top">
                                                                    <div className="flex flex-col items-center gap-0.5">
                                                                        <span className="text-sm font-bold text-orange-600">
                                                                            + PKR {marginAmount.toLocaleString()}
                                                                        </span>
                                                                        {hasOverride && (
                                                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                                                                Custom
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                {/* Final Price */}
                                                                <td className="px-4 py-3 text-center whitespace-nowrap align-top">
                                                                    <div className="text-sm font-bold text-green-600">
                                                                        PKR {finalPrice.toLocaleString()}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Set Group Margin Modal ─────────────────────────────────── */}
            {marginModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) closeMarginModal(); }}
                >
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-1">Set Group Margin</h2>
                        <p className="text-sm text-gray-500 mb-5">
                            Select a group, enter the PKR margin — it applies to
                            <strong> every flight in that group</strong> and is recorded in the ledger.
                        </p>

                        <div className="space-y-4">
                            {/* Group category picker */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Select Group
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {API_GROUP_CATEGORIES.filter((c) => c.key !== "all").map((cat) => {
                                        const isSelected = selectedGroup === cat.key;
                                        const hasMargin = categoryHasOverride(cat.key);
                                        return (
                                            <button
                                                key={cat.key}
                                                type="button"
                                                onClick={() => handleGroupSelect(cat.key)}
                                                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${isSelected
                                                    ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                                                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/40"
                                                    }`}
                                            >
                                                <span>{cat.label}</span>
                                                {hasMargin && (
                                                    <span className="ml-2 shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                                        PKR {categoryOverrideAmount(cat.key)?.toLocaleString()}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Amount input — only shows after group is selected */}
                            {selectedGroup && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                                            Margin Amount (PKR) —{" "}
                                            <span className="font-normal text-blue-600">
                                                applies to all flights in{" "}
                                                <strong>
                                                    {API_GROUP_CATEGORIES.find((c) => c.key === selectedGroup)?.label}
                                                </strong>
                                            </span>
                                        </label>
                                        <input
                                            ref={amountInputRef}
                                            type="number"
                                            min="0"
                                            value={modalAmount}
                                            onChange={(e) => setModalAmount(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveMargin(); }}
                                            placeholder="e.g. 500"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                                            Note{" "}
                                            <span className="font-normal text-gray-400">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={modalNote}
                                            onChange={(e) => setModalNote(e.target.value)}
                                            placeholder="e.g. Special arrangement"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                A <strong>MarginLedger</strong> entry is created when you save.
                                The margin overrides the global margin for all flights in the selected group.
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={closeMarginModal}
                                disabled={modalSaving}
                                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveMargin}
                                disabled={modalSaving || !selectedGroup || modalAmount === ""}
                                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                            >
                                {modalSaving ? "Saving…" : "Save & Record Ledger"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}