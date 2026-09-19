import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../Api/axios";
import PageMeta from "../../components/common/PageMeta";
import { toast } from "react-toastify";

/* ───────────────────────── types ───────────────────────── */

interface FlightDetail {
  flight_no: string;
  flight_date?: string;
  dep_date: string;
  dept_time: string;
  arv_date?: string;
  arv_time: string;
  origin: string;
  destination: string;
  baggage?: string;
  meal?: string;
}

interface RuleLevel {
  margin: number;
  visible: boolean;
}

interface MarginInfo {
  basePrice: number;
  keys: { provider: string; sector: string; flight: string };
  levels: { provider: RuleLevel; sector: RuleLevel; flight: RuleLevel };
  totalMargin: number;
  finalPrice: number;
  visible: boolean;
  hiddenBy: string[];
}

interface ApiGroup {
  id: string | number;
  source: string;
  sector: string;
  type?: string;
  price: number;
  pnr?: string;
  available_no_of_pax?: number;
  dept_date?: string;
  airline?: { airline_name?: string; logo_url?: string | null } | null;
  details: FlightDetail[];
  marginInfo: MarginInfo;
}

type RuleMap = Record<string, { margin: number; visible: boolean }>;
type Level = "provider" | "sector" | "flight";

interface RulePayload {
  level: Level;
  source: string;
  sector?: string;
  groupId?: string;
}

/* ───────────────────────── helpers ───────────────────────── */

const PROVIDERS: Record<string, { label: string; badge: string }> = {
  admin: { label: "Admin (Own Groups)", badge: "bg-purple-100 text-purple-700 border-purple-200" },
  "al-haider": { label: "Al-Haider", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "travel-network": { label: "Travel Network", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  abidairtravel: { label: "Abid Air International", badge: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  sabaoon: { label: "Al-Saboor", badge: "bg-sky-100 text-sky-700 border-sky-200" },
  NCT: { label: "NCT", badge: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  mct: { label: "MCT", badge: "bg-rose-100 text-rose-700 border-rose-200" },
};

const providerLabel = (source: string) => PROVIDERS[source]?.label || source;
const providerBadge = (source: string) =>
  PROVIDERS[source]?.badge || "bg-gray-100 text-gray-700 border-gray-200";

const DEFAULT_RULE: RuleLevel = { margin: 0, visible: true };

const providerKey = (source: string) => `provider|${source}`;
const sectorKey = (source: string, sector: string) =>
  `sector|${source}|${String(sector)
    .split("-")
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean)
    .join("-")}`;
const flightKey = (source: string, id: string | number) => `flight|${source}|${id}`;

const toIsoDay = (value?: string | null) => {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${parsed.getFullYear()}-${m}-${d}`;
};

const formatDate = (value?: string | null) => {
  const iso = toIsoDay(value);
  if (!iso) return value || "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const groupDate = (g: ApiGroup) => toIsoDay(g.dept_date || g.details?.[0]?.dep_date);

const money = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

const PlaneSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
  </svg>
);

const RefreshSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="1em" height="1em">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

/* ───────────────────────── controls ───────────────────────── */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-green-500" : "bg-gray-300"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-4.5" : "left-0.5"}`}
      />
    </button>
  );
}

/** Visibility toggle + PKR margin input + Save, bound to one rule. */
function RuleControl({
  rule,
  onSave,
}: {
  rule: RuleLevel;
  onSave: (patch: { margin?: number; visible?: boolean }) => Promise<void>;
}) {
  const [draft, setDraft] = useState(String(rule.margin));

  useEffect(() => setDraft(String(rule.margin)), [rule.margin]);

  const parsed = Number(draft);
  const valid = draft.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;
  const dirty = valid && parsed !== rule.margin;

  return (
    <div className="flex items-center gap-2">
      <Toggle checked={rule.visible} onChange={(visible) => onSave({ visible })} />
      <span className={`w-11 text-[11px] font-semibold ${rule.visible ? "text-green-600" : "text-gray-400"}`}>
        {rule.visible ? "Visible" : "Hidden"}
      </span>
      <span className="text-[11px] text-gray-400">PKR</span>
      <input
        type="number"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && dirty && onSave({ margin: parsed })}
        className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
      />
      <button
        type="button"
        disabled={!dirty}
        onClick={() => onSave({ margin: parsed })}
        className="rounded-md bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition enabled:bg-blue-600 enabled:text-white enabled:hover:bg-blue-700 disabled:cursor-default"
      >
        Save
      </button>
    </div>
  );
}

/* ───────────────────────── page ───────────────────────── */

export default function ApiGroups() {
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [rules, setRules] = useState<RuleMap>({});
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [departure, setDeparture] = useState("");
  const [providersOpen, setProvidersOpen] = useState(true);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [groupsRes, rulesRes] = await Promise.all([
        axiosInstance.get("/sector/getUnifiedGroups"),
        axiosInstance.get("/margin-rules"),
      ]);
      setGroups(groupsRes.data?.success ? groupsRes.data.data || [] : []);
      setRules(rulesRes.data?.success ? rulesRes.data.data || {} : {});
    } catch (err) {
      console.error(err);
      toast.error("Failed to load API groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const ruleOf = (key: string): RuleLevel => rules[key] || DEFAULT_RULE;

  const saveRule = async (
    payload: RulePayload,
    key: string,
    patch: { margin?: number; visible?: boolean },
  ) => {
    try {
      const res = await axiosInstance.put("/margin-rules", { ...payload, ...patch });
      const saved = res.data?.data;
      setRules((prev) => {
        const next = { ...prev };
        if (saved && (saved.margin > 0 || saved.visible === false)) {
          next[key] = { margin: saved.margin, visible: saved.visible };
        } else {
          delete next[key];
        }
        return next;
      });
      toast.success(patch.margin !== undefined ? "Margin saved" : patch.visible ? "Now visible to agents" : "Hidden from agents");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save");
    }
  };

  // Recompute every group's breakdown from the live rule map so a save shows
  // instantly without re-hitting the (slow) provider APIs.
  const computed = useMemo(
    () =>
      groups.map((g) => {
        const keys = g.marginInfo?.keys || {
          provider: providerKey(g.source),
          sector: sectorKey(g.source, g.sector),
          flight: flightKey(g.source, g.id),
        };
        const levels = {
          provider: ruleOf(keys.provider),
          sector: ruleOf(keys.sector),
          flight: ruleOf(keys.flight),
        };
        const base = Number(g.price || 0);
        const total = levels.provider.margin + levels.sector.margin + levels.flight.margin;
        const hiddenBy = (["provider", "sector", "flight"] as Level[]).filter((l) => !levels[l].visible);
        // Margin only applies to priced (>0) fares — same rule the backend uses
        return { group: g, keys, levels, base, total, final: base > 0 ? base + total : base, hiddenBy };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, rules],
  );

  const types = useMemo(
    () => [...new Set(groups.map((g) => g.type).filter(Boolean) as string[])].sort(),
    [groups],
  );

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return computed.filter(({ group: g }) => {
      if (typeFilter !== "all" && g.type !== typeFilter) return false;
      if (departure && groupDate(g) !== departure) return false;
      if (!q) return true;
      return [g.sector, g.airline?.airline_name, g.pnr, ...(g.details || []).map((d) => d.flight_no)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [computed, typeFilter, search, departure]);

  const providers = useMemo(() => [...new Set(groups.map((g) => g.source))], [groups]);

  // provider → sector → rows
  const sections = useMemo(() => {
    const map = new Map<string, { source: string; sectorTitle: string; sKey: string; airline: ApiGroup["airline"]; rows: typeof visibleRows }>();
    visibleRows.forEach((row) => {
      const sKey = row.keys.sector;
      if (!map.has(sKey)) {
        map.set(sKey, { source: row.group.source, sectorTitle: row.group.sector, sKey, airline: row.group.airline, rows: [] });
      }
      const section = map.get(sKey)!;
      if (!section.airline?.logo_url && row.group.airline?.logo_url) section.airline = row.group.airline;
      section.rows.push(row);
    });
    map.forEach((s) => s.rows.sort((a, b) => groupDate(a.group).localeCompare(groupDate(b.group))));
    return [...map.values()];
  }, [visibleRows]);

  const copyFlight = async (g: ApiGroup, final: number) => {
    const legs = (g.details || [])
      .map((d) => `${d.flight_no} ${d.origin}-${d.destination} ${formatDate(d.dep_date)} ${d.dept_time?.substring(0, 5) || ""}-${d.arv_time?.substring(0, 5) || ""}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(`${g.airline?.airline_name || ""} ${g.sector}\n${legs}\n${money(final)}`);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const controlFor = (payload: RulePayload, key: string) => (
    <RuleControl rule={ruleOf(key)} onSave={(patch) => saveRule(payload, key, patch)} />
  );

  return (
    <>
      <PageMeta title="API Groups | Admin" description="Manage API group margins and visibility" />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">All Groups API Groups</h1>
            <p className="mt-1 text-sm text-gray-500">
              Showing {visibleRows.length} groups · admin sees every group, agents only see visible ones with margin added
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshSVG className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* type chips */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-600">Type:</span>
          {["all", ...types].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                typeFilter === t
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>

        {/* search + date */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by sector, airline, PNR..."
            className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
            Departure:
            <input
              type="date"
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none"
            />
          </label>
        </div>

        {/* provider-wise */}
        {!loading && providers.length > 0 && (
          <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-blue-800">Provider-wise Margin &amp; Visibility</h2>
              <button onClick={() => setProvidersOpen((o) => !o)} className="text-xs font-semibold text-blue-600">
                {providersOpen ? "Hide ▲" : "Show ▼"}
              </button>
            </div>
            {providersOpen && (
              <div className="space-y-2">
                {providers.map((source) => (
                  <div key={source} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${providerBadge(source)}`}>
                      {providerLabel(source)}
                    </span>
                    {controlFor({ level: "provider", source }, providerKey(source))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No groups match the current filters</div>
        ) : (
          <div className="space-y-5">
            {sections.map((section) => (
              <div key={section.sKey} className="overflow-hidden rounded-2xl border border-neutral-200">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-linear-to-r from-blue-50 via-white to-blue-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-4">
                    {section.airline?.logo_url ? (
                      <img src={section.airline.logo_url} alt={section.airline.airline_name} style={{ height: 40 }} className="object-contain" />
                    ) : (
                      <span className="text-sm font-semibold text-gray-700">{section.airline?.airline_name}</span>
                    )}
                    <div className="flex items-center gap-2">
                      <PlaneSVG className="text-lg text-blue-500" />
                      <span className="text-lg font-bold uppercase tracking-widest text-gray-800">{section.sectorTitle}</span>
                    </div>
                    {controlFor(
                      { level: "sector", source: section.source, sector: section.sectorTitle },
                      section.sKey,
                    )}
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${providerBadge(section.source)}`}>
                    {providerLabel(section.source)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="font-bold text-white" style={{ background: "linear-gradient(90deg, #21397C 0%, #2CA3B4 100%)" }}>
                        <th className="px-4 py-2.5 text-left">Date</th>
                        <th className="px-4 py-2.5 text-left">Flight</th>
                        <th className="px-4 py-2.5 text-center">Sector</th>
                        <th className="px-4 py-2.5 text-center">Bag</th>
                        <th className="px-4 py-2.5 text-center">Meal</th>
                        <th className="px-4 py-2.5 text-center">Seats</th>
                        <th className="px-4 py-2.5 text-center">Base Price</th>
                        <th className="px-4 py-2.5 text-center">Margin (P + S + F)</th>
                        <th className="px-4 py-2.5 text-center">Agent Price</th>
                        <th className="px-4 py-2.5 text-center">Flight Margin &amp; Visibility</th>
                        <th className="px-4 py-2.5 text-center">Copy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map(({ group: g, keys, levels, base, total, final, hiddenBy }) => {
                        const legs = g.details?.length ? g.details : [];
                        return (
                          <tr
                            key={`${g.source}-${g.id}`}
                            className={`border-b border-gray-100 align-top ${hiddenBy.length ? "bg-gray-50 opacity-60" : "bg-white hover:bg-blue-50/40"}`}
                          >
                            <td className="px-4 py-3 font-bold text-gray-600">
                              {legs.length ? legs.map((d, i) => <div key={i} className="whitespace-nowrap py-0.5">{formatDate(d.dep_date || d.flight_date)}</div>) : formatDate(g.dept_date)}
                            </td>
                            <td className="px-4 py-3">
                              {legs.map((d, i) => (
                                <div key={i} className="py-0.5">
                                  <div className="flex items-center gap-1 font-bold text-gray-800"><PlaneSVG className="text-blue-500" />{d.flight_no || "—"}</div>
                                  <div className="text-[11px] text-gray-500">{d.dept_time?.substring(0, 5) || "—"} - {d.arv_time?.substring(0, 5) || "—"}</div>
                                </div>
                              ))}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-700">
                              {legs.map((d, i) => <div key={i} className="whitespace-nowrap py-0.5">{d.origin} → {d.destination}</div>)}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-700">
                              {legs.map((d, i) => <div key={i} className="py-0.5">{d.baggage || "—"}</div>)}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-700">
                              {legs.map((d, i) => <div key={i} className="py-0.5">{d.meal || "—"}</div>)}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-gray-700">{g.available_no_of_pax ?? "—"}</td>
                            <td className="px-4 py-3 text-center font-bold text-gray-700">{money(base)}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="font-bold text-orange-600">{money(total)}</div>
                              <div className="text-[10px] text-gray-400">
                                {levels.provider.margin} + {levels.sector.margin} + {levels.flight.margin}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="font-bold text-blue-700">{money(final)}</div>
                              {hiddenBy.length > 0 && (
                                <div className="text-[10px] font-semibold text-red-500">Hidden ({hiddenBy.join(", ")})</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {controlFor({ level: "flight", source: g.source, groupId: String(g.id) }, keys.flight)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => copyFlight(g, final)}
                                title="Copy flight details"
                                className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
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
        )}
      </div>
    </>
  );
}
