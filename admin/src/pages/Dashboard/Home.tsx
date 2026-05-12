import PageMeta from "../../components/common/PageMeta";
import {
  ArrowRightIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  BuildingOffice2Icon,
  CircleStackIcon,
  Cog6ToothIcon,
  MapPinIcon,
  PaperAirplaneIcon,
  PhoneIcon,
  Squares2X2Icon,
  TagIcon,
  TicketIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router";
import AgentStatusChart from "../../components/charts/AgentStatusChart";
import { useEffect, useState } from "react";
import axiosInstance from "../../Api/axios";
import { Modal } from "../../components/ui/modal";

interface UnifiedGroup {
  id: string;
  source: string;
  sector: string;
  type: string;
  available_no_of_pax: number;
  price: number;
  dept_date: string;
  airline: {
    airline_name: string;
    short_name: string;
    logo_url: string | null;
  };
  pnr: string;
}

const MONTHS_TITLE = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DASHBOARD_CATEGORIES = [
  {
    title: "All Groups",
    description: "Fetch all available bookings.",
    category: "all",
    accentClass: "from-slate-500 to-blue-600",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    title: "UAE",
    description: "Fetch UAE group bookings.",
    category: "uae",
    accentClass: "from-cyan-500 to-sky-600",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-100",
  },
  {
    title: "KSA",
    description: "Fetch KSA group bookings.",
    category: "ksa",
    accentClass: "from-emerald-500 to-teal-600",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    title: "Muscat",
    description: "Fetch Muscat group bookings.",
    category: "muscat",
    accentClass: "from-violet-500 to-indigo-600",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    title: "Umrah",
    description: "Fetch Umrah group bookings.",
    category: "umrah",
    accentClass: "from-rose-500 to-red-600",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-100",
  },
  {
    title: "UK",
    description: "Fetch UK group bookings.",
    category: "uk",
    accentClass: "from-amber-500 to-orange-600",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-100",
  },
];

const DASHBOARD_SHORTCUTS = [
  {
    title: "Add Sector",
    path: "/sector",
    colorClass: "from-blue-500 to-blue-600",
    icon: MapPinIcon,
  },
  {
    title: "Add Airline",
    path: "/airline",
    colorClass: "from-sky-500 to-cyan-500",
    icon: PaperAirplaneIcon,
  },
  {
    title: "Add Group",
    path: "/group-ticketing/create",
    colorClass: "from-emerald-500 to-teal-500",
    icon: UserGroupIcon,
  },
  {
    title: "All Bookings",
    path: "/all-bookings",
    colorClass: "from-violet-500 to-purple-500",
    icon: TicketIcon,
  },
  {
    title: "Special Offers",
    path: "/special-offers",
    colorClass: "from-pink-500 to-rose-500",
    icon: TagIcon,
  },
  {
    title: "Manage Sectors",
    path: "/manage-sectors",
    colorClass: "from-amber-500 to-orange-500",
    icon: Cog6ToothIcon,
  },
  {
    title: "Agencies",
    path: "/registered-agencies",
    colorClass: "from-teal-500 to-cyan-500",
    icon: BuildingOffice2Icon,
  },
  {
    title: "Add Bank",
    path: "/add-bank",
    colorClass: "from-indigo-500 to-violet-500",
    icon: BuildingLibraryIcon,
  },
  {
    title: "Group Ticketing",
    path: "/group-ticketing",
    colorClass: "from-orange-500 to-amber-500",
    icon: TicketIcon,
  },
  {
    title: "Accounts",
    path: "/view-accounts",
    colorClass: "from-cyan-600 to-sky-600",
    icon: BanknotesIcon,
  },
  {
    title: "API Groups",
    path: "/api-groups",
    colorClass: "from-fuchsia-500 to-pink-500",
    icon: CircleStackIcon,
  },
  {
    title: "Team Contacts",
    path: "/team-contacts",
    colorClass: "from-lime-500 to-green-600",
    icon: PhoneIcon,
  },
];

function trimTime(t: string): string {
  if (!t) return "";
  return t.slice(0, 5);
}

function extractIATA(terminal: string): string {
  if (!terminal) return "";
  const match = terminal.match(/\(([A-Z]{3})\)/);
  return match ? match[1] : terminal.trim();
}

function buildCopyText(groups: UnifiedGroup[]): string {
  if (!groups.length) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const header = `                *=====${String(today.getDate()).padStart(2, "0")} ${MONTHS_TITLE[today.getMonth()].toUpperCase()} UPDATES=====*`;

  // ── Step A: Build sector-grouped map (preserving API sector order) ──
  const sectorMap = new Map<string, { group: any; date: Date; price: number; line: string }[]>();
  const sectorOrder: string[] = [];

  groups.forEach((g: any) => {
    if (g.available_no_of_pax !== undefined && g.available_no_of_pax <= 0) return;

    const sector = g.sector || "UNKNOWN";
    const price = g.price || 0;

    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, []);
      sectorOrder.push(sector);
    }

    if (g.details && g.details.length > 0) {
      const d = g.details[0];
      const rawDate = d.dep_date || d.flight_date || g.dept_date;
      if (!rawDate) return;

      const date = new Date(rawDate);
      if (isNaN(date.getTime())) return;

      const depDay = new Date(date);
      depDay.setHours(0, 0, 0, 0);
      if (depDay < today) return;

      const dd = String(date.getDate()).padStart(2, "0");
      const mon = MONTHS_TITLE[date.getMonth()];
      const year = date.getFullYear();
      const flightNo = (d.flight_no || d.flightNo || "").toUpperCase();
      const origin = extractIATA(d.origin || d.from || "");
      const dest = extractIATA(d.destination || d.to || "");
      const depTime = trimTime(d.dept_time || d.dep_time || d.depTime || "");
      const arvTime = trimTime(d.arv_time || d.arr_time || d.arrTime || "");
      const depPart = depTime ? ` (${depTime})` : "";
      const arvPart = arvTime ? ` (${arvTime})` : "";

      const line = `${flightNo} *${dd} ${mon} ${year}* ${origin}${depPart} ${dest}${arvPart}..... *PKR ${price}*`;

      sectorMap.get(sector)!.push({ group: g, date, price, line });

    } else {
      // Fallback: no details
      const rawDate = g.dept_date;
      if (!rawDate) return;

      const date = new Date(rawDate);
      if (isNaN(date.getTime())) return;

      const depDay = new Date(date);
      depDay.setHours(0, 0, 0, 0);
      if (depDay < today) return;

      const dd = String(date.getDate()).padStart(2, "0");
      const mon = MONTHS_TITLE[date.getMonth()];
      const year = date.getFullYear();
      const code = g.airline?.short_name || "";
      const sec = (g.sector || "").replace("-", " ");

      const line = `${code} *${dd} ${mon} ${year}* ${sec}..... *PKR ${price}*`;

      sectorMap.get(sector)!.push({ group: g, date, price, line });
    }
  });

  // ── Step B: Sort each sector's entries by date → then price ──
  sectorMap.forEach((entries) => {
    entries.sort((a, b) => {
      const timeDiff = a.date.getTime() - b.date.getTime();
      if (timeDiff !== 0) return timeDiff;   // earlier date first
      return a.price - b.price;              // same date → cheaper first
    });
  });

  // ── Step C: Build final output in sector order ──
  const lines: string[] = [];
  sectorOrder.forEach((sector) => {
    const entries = sectorMap.get(sector)!;
    entries.forEach((e) => lines.push(e.line));
  });

  const footer =
    `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*
=======================
Shaheen Wings Travels
Mobile: 0309-9802154
Address: MA Plaza Ground Floor Shop # 3, Kahror Pacca.
Ptcl: 0608340174
Website: shaheenwings.com`;

  return [header, ...lines, "=======================", footer].join("\n");
}

export default function Home() {
  const [unifiedGroups, setUnifiedGroups] = useState<UnifiedGroup[]>([]);
  const [copied, setCopied] = useState(false);
  const [isMarginModalOpen, setIsMarginModalOpen] = useState(false);
  const [marginValue, setMarginValue] = useState("");
  const [marginType, setMarginType] = useState<"percent" | "amount">("percent");
  const [isApplyingMargin, setIsApplyingMargin] = useState(false);
  const [currentMargin, setCurrentMargin] = useState<{ value: number; type: "percent" | "amount" } | null>(null);

  const fetchUnifiedGroups = async () => {
    try {
      const response = await axiosInstance.get("/sector/getUnifiedGroups");
      if (response.data.success && Array.isArray(response.data.data)) {
        setUnifiedGroups(response.data.data);
      } else {
        console.warn("Data format matches but array not found or success is false");
      }
    } catch (error: any) {
      console.error("Error fetching unified groups:", error);
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
    } catch (error: any) {
      console.error("Error fetching margin:", error);
    }
  };

  const handleCopyData = async () => {
    const text = buildCopyText(unifiedGroups);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleApplyMargin = async () => {
    if (!marginValue || marginValue === "0") {
      alert("Please enter a valid margin value");
      return;
    }

    setIsApplyingMargin(true);
    try {
      const payload = {
        value: parseFloat(marginValue),
        type: marginType,
      };

      const response = await axiosInstance.post("/sector/applyMargin", payload);

      if (response.data.success) {
        alert(`Margin saved: ${marginValue} ${marginType === "percent" ? "%" : "Rs"}`);
        setIsMarginModalOpen(false);
        setMarginValue("");
        setMarginType("percent");
        // Fetch updated margin
        fetchMargin();
      } else {
        alert(response.data.message || "Failed to save margin");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Error saving margin");
      console.error("Error saving margin:", error);
    } finally {
      setIsApplyingMargin(false);
    }
  };

  useEffect(() => {
    fetchUnifiedGroups();
    fetchMargin();
  }, []);

  return (
    <>
      <PageMeta
        title="Dashboard | Shaheen Wings Ticket Travel"
        description="Dashboard overview for Shaheen Wings Ticket Travel"
      />

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-black dark:text-white">Dashboard</h1>
          <div className="text-sm text-gray-500">
            <span className="text-blue-600">Home</span> / Profile
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-3">
        <button
          onClick={handleCopyData}
          disabled={unifiedGroups.length === 0}
          title={unifiedGroups.length === 0 ? "No data available to copy" : "Copy flight data"}
          style={{
            backgroundColor: unifiedGroups.length === 0 ? '#d1d5db' : copied ? '#22c55e' : '#3b82f6',
            color: 'white',
            opacity: unifiedGroups.length === 0 ? 0.6 : 1
          }}
          className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all cursor-pointer"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Sectors Data ({unifiedGroups.length})
            </>
          )}
        </button>

        <button
          onClick={() => setIsMarginModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all cursor-pointer ml-3 bg-purple-600 hover:bg-purple-700 text-white"
          title="Apply margin to all groups"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Apply Margin
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {DASHBOARD_SHORTCUTS.map((tab) => (
          <Link
            key={tab.title}
            to={tab.path}
            className={`group flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-linear-to-r px-4 py-4 text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${tab.colorClass}`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/40 bg-white/20">
              <tab.icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold tracking-wide">{tab.title}</span>
          </Link>
        ))}
      </div>

      {/* Categories Section */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/3 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-gray-100 pb-5 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">
              Group Categories
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {DASHBOARD_CATEGORIES.map((category) => {
            const target = category.category === "all"
              ? "/api-groups"
              : `/api-groups?category=${encodeURIComponent(category.category)}`;

            return (
              <div
                key={category.title}
                className={`relative overflow-hidden rounded-2xl bg-linear-to-r p-4 text-white shadow-sm ${category.accentClass}`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),transparent_55%)]" />
                <div className="relative z-10 flex h-full flex-col">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/40 bg-white/15">
                      <Squares2X2Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                      {category.title}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="text-3xl font-extrabold tracking-tight">
                        {category.title}
                      </h3>
                      <p className="mt-1 text-sm text-white/85">
                        {category.description}
                      </p>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <Link
                        to={target}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/40 bg-white/15 px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/25"
                      >
                        View Groups
                        <ArrowRightIcon className="h-4 w-4" />
                      </Link>

                      {category.category === "all" ? (
                        <button
                          type="button"
                          className="rounded-lg bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700"
                          disabled
                        >
                          All
                        </button>
                      ) : (
                        <Link
                          to="/sector"
                          className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          + Add Sector
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agent Status Chart */}
      <div className="mb-6">
        <AgentStatusChart />
      </div>

      {/* View Sections */}
      {/* <div className="grid grid-cols-1 gap-4 mb-6">
        <button className="bg-linear-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-semibold py-4 px-6 rounded-lg transition-all shadow-lg text-lg">
          View All Groups
        </button>
      </div> */}

      {/* Apply Margin Modal */}
      <Modal
        isOpen={isMarginModalOpen}
        onClose={() => {
          setIsMarginModalOpen(false);
          setMarginValue("");
          setMarginType("percent");
        }}
        className="max-w-md"
      >
        <div className="p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-black dark:text-white mb-6">Apply Margin</h2>

          {/* Current Margin Info */}
          {currentMargin && currentMargin.value > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-6">
              <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                <strong>Current Margin:</strong> {currentMargin.value} {currentMargin.type === "percent" ? "%" : "Rs"}
              </p>
            </div>
          )}

          <div className="space-y-5">
            {/* Margin Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Margin Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="marginType"
                    value="percent"
                    checked={marginType === "percent"}
                    onChange={(e) => setMarginType(e.target.value as "percent" | "amount")}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Percentage (%)</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="marginType"
                    value="amount"
                    checked={marginType === "amount"}
                    onChange={(e) => setMarginType(e.target.value as "percent" | "amount")}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Fixed Amount (Rs)</span>
                </label>
              </div>
            </div>

            {/* Margin Value Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Margin Value
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={marginValue}
                  onChange={(e) => setMarginValue(e.target.value)}
                  placeholder={marginType === "percent" ? "Enter percentage (e.g., 5)" : "Enter amount (e.g., 500)"}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 font-medium">
                  {marginType === "percent" ? "%" : "Rs"}
                </span>
              </div>
            </div>

            {/* Info Text */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                {marginType === "percent"
                  ? "This margin will be applied at the frontend when displaying prices."
                  : "This margin will be applied at the frontend when displaying prices."}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => {
                setIsMarginModalOpen(false);
                setMarginValue("");
                setMarginType("percent");
              }}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              disabled={isApplyingMargin}
            >
              Cancel
            </button>
            <button
              onClick={handleApplyMargin}
              disabled={isApplyingMargin || !marginValue}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {isApplyingMargin ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
