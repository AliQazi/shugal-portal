import { useEffect, useState } from "react";
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
];

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

// const AlertIcon = ({ className = "" }: { className?: string }) => (
//     <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
//         <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
//     </svg>
// );

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
}

interface ApiGroup {
    id: string | number;
    groupName?: string;
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function ApiGroups() {
    const [searchParams] = useSearchParams();
    const [groups, setGroups] = useState<ApiGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const activeCategory = searchParams.get("category") || "all";
    const activeCategoryLabel =
        API_GROUP_CATEGORIES.find((item) => item.key === activeCategory)?.label || "All Groups";

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const fetchGroups = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get("/al-haider/available-bookings-by-group", {
                params: activeCategory === "all" ? {} : { category: activeCategory },
            });
            if (res.data?.success) {
                const data: ApiGroup[] = res.data.data || [];
                setGroups(data);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load Al-Haider API groups");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, [activeCategory]);

    // ── Group by airline × sector ─────────────────────────────────────────────

    const groupedData = groups.reduce<Record<string, GroupedEntry>>((acc, group) => {
        const airlineName = group.airline?.airline_name || "Unknown";
        const sector = (group.sector || "Unknown").toUpperCase().trim();
        const key = `${airlineName}||${sector}`;
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

    // ── Render helpers ────────────────────────────────────────────────────────

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
                description="View Al-Haider API group flights"
            />

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 min-h-screen">
                {/* ─── Page header ─────────────────────────────────────────────── */}
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
                </div>

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

                {/* ─── Info banner ─────────────────────────────────────────────── */}
                {/* <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                    <AlertIcon className="mt-0.5 shrink-0 text-amber-500 w-4 h-4" />
                    <div>
                        <strong>How margins work:</strong> If an individual margin (PKR fixed amount) is set for a group,{" "}
                        only that margin is applied on the frontend — agent and global margins are ignored for that group.
                        Clear the margin field and save to revert to global/agent margins.
                    </div>
                </div> */}

                {/* ─── Content ─────────────────────────────────────────────────── */}
                {loading ? (
                    <LoadingSkeleton />
                ) : groups.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        No {activeCategoryLabel.toLowerCase()} groups returned from Al-Haider API
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
                                    {/* ── Airline / Sector header ─────────────────────── */}
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

                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 tracking-wide">
                                            AL-HAIDER API
                                        </span>
                                    </div>

                                    {/* ── Flight Table ─────────────────────────────── */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="text-white text-xs font-bold" style={{ background: "linear-gradient(90deg, #21397C 0%, #2CA3B4 100%)" }}>
                                                    <th className="px-4 py-2.5 text-left whitespace-nowrap">Date</th>
                                                    <th className="px-4 py-2.5 text-left whitespace-nowrap">Flight</th>
                                                    <th className="px-4 py-2.5 text-center whitespace-nowrap">Sector</th>
                                                    <th className="px-4 py-2.5 text-center whitespace-nowrap">Bag</th>
                                                    <th className="px-4 py-2.5 text-center whitespace-nowrap">Meal</th>
                                                    {/* <th className="px-4 py-2.5 text-center whitespace-nowrap">Seats</th> */}
                                                    <th className="px-4 py-2.5 text-center whitespace-nowrap">Seats</th>
                                                    <th className="px-4 py-2.5 text-center whitespace-nowrap">Base Price</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.groups
                                                    .sort((a, b) => {
                                                        const da = a.dept_date || a.details?.[0]?.dep_date || "";
                                                        const db = b.dept_date || b.details?.[0]?.dep_date || "";
                                                        return da.localeCompare(db);
                                                    })
                                                    .map((group) => {
                                                        const id = String(group.id);
                                                        const flight = group.details?.[0];

                                                        return (
                                                            <tr key={id} className="border-b border-gray-100 bg-white hover:bg-blue-50/40 transition-colors">
                                                                {/* Date */}
                                                                <td className="px-4 py-3 text-xs font-medium text-gray-600 whitespace-nowrap">
                                                                    {flight
                                                                        ? new Date(flight.flight_date).toLocaleDateString("en-GB", {
                                                                            day: "2-digit",
                                                                            month: "short",
                                                                            year: "numeric",
                                                                        })
                                                                        : "—"}
                                                                </td>

                                                                {/* Flight */}
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <PlaneSVG className="text-xs text-blue-500 shrink-0" />
                                                                        <span className="font-semibold text-sm whitespace-nowrap">
                                                                            {flight?.flight_no || "—"}
                                                                        </span>
                                                                    </div>
                                                                </td>

                                                                {/* Sector with route + time */}
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center justify-center gap-3">
                                                                        <div className="text-center">
                                                                            <div className="text-sm font-bold">{origin}</div>
                                                                            <div className="text-xs text-gray-500 font-medium">
                                                                                {flight?.dept_time?.substring(0, 5) || "—"}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center relative min-w-10 w-16">
                                                                            <div className="h-0.5 w-full bg-linear-to-r from-blue-400 to-blue-600" />
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
                                                                </td>

                                                                {/* Baggage */}
                                                                <td className="px-4 py-3 text-center">
                                                                    {flight?.baggage ? (
                                                                        <div className="inline-flex items-center gap-1 text-xs font-medium">
                                                                            <SuitcaseSVG className="text-xs text-blue-500 shrink-0" />
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

                                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                                    <span className="text-sm font-bold text-gray-800">
                                                                        {group.available_no_of_pax}
                                                                    </span>
                                                                </td>

                                                                {/* Base Price */}
                                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                                    <div className="text-sm font-bold text-blue-600">
                                                                        PKR {group.price.toLocaleString()}
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
        </>
    );
}