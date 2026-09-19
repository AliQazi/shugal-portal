import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import axiosInstance from "../../Api/axios";
import PageMeta from "../../components/common/PageMeta";
import { toast } from "react-toastify";

/* ───────────────────────── types ───────────────────────── */

type Source = "travel-network" | "abidairtravel";
type Tab = "all" | Source;

interface RuleLevel {
  margin: number;
  visible: boolean;
}
type RuleMap = Record<string, RuleLevel>;

interface Hotel {
  city: string;
  name: string;
  dist: string;
}

interface Row {
  key: string;
  source: Source;
  id: string;
  name: string;
  airline: string;
  logo: string | null;
  days: number;
  from: string;
  to: string;
  sector: string;
  rates: { double: number; triple: number; quad: number; sharing: number };
  hotels: Hotel[];
  sourceKey: string;
  packageKey: string;
}

const SOURCES: { key: Source; label: string; badge: string }[] = [
  { key: "travel-network", label: "Travel Network", badge: "bg-purple-100 text-purple-700" },
  { key: "abidairtravel", label: "Abid Air", badge: "bg-cyan-100 text-cyan-700" },
];

const DEFAULT_RULE: RuleLevel = { margin: 0, visible: true };

/* ───────────────────────── helpers ───────────────────────── */

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (n: number) => (n > 0 ? Math.round(n).toLocaleString() : "—");

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const parseHotels = (pkg: any): Hotel[] => {
  const hotels = pkg.hotels;
  if (Array.isArray(hotels)) {
    return hotels.map((h: any) => ({
      city: String(h.city || h.location || ""),
      name: String(h.hotelName || h.name || ""),
      dist: h.distance ? String(h.distance) : "",
    }));
  }
  if (hotels && typeof hotels === "object") {
    return Object.entries(hotels)
      .filter(([, h]) => h)
      .map(([city, h]: [string, any]) => ({
        city,
        name: typeof h === "string" ? h : String(h.hotelName || h.name || ""),
        dist: typeof h === "object" && h.distance ? String(h.distance) : "",
      }));
  }
  return [];
};

const toRow = (pkg: any): Row | null => {
  const info = pkg.ruleInfo;
  if (!info) return null;

  const fares = pkg.rooms || pkg.rates || {};
  const details = Array.isArray(pkg.details) ? pkg.details : [];
  const airline = pkg.airline || {};

  return {
    key: info.keys.package,
    source: info.source,
    id: info.id,
    name: String(pkg.packageName || pkg.package_name || "Umrah Package"),
    airline: String(airline.airline_name || airline.short_name || ""),
    logo: airline.logo_url || null,
    days: num(pkg.days || pkg.package_days || pkg.packageDuration),
    from: pkg.dept_date || details[0]?.dep_date || "",
    to: pkg.arv_date || details[details.length - 1]?.arv_date || "",
    sector: String(pkg.sector || ""),
    rates: {
      double: num(fares.double),
      triple: num(fares.triple),
      quad: num(fares.quad),
      sharing: num(fares.sharing ?? fares.shared),
    },
    hotels: parseHotels(pkg),
    sourceKey: info.keys.source,
    packageKey: info.keys.package,
  };
};

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-green-500" : "bg-gray-300"}`}
  >
    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-4.5" : "left-0.5"}`} />
  </button>
);

/** Margin input + Save bound to one rule; keeps its own draft. */
function MarginBox({
  value,
  onSave,
  width = "w-24",
  label,
}: {
  value: number;
  onSave: (margin: number) => Promise<void>;
  width?: string;
  label?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const parsed = Number(draft);
  const valid = draft.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;
  const dirty = valid && parsed !== value;

  return (
    <span className="inline-flex items-center gap-1.5">
      {label && <span className="text-xs font-bold text-purple-800">{label}</span>}
      <input
        type="number"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && dirty && onSave(parsed)}
        className={`${width} rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:border-purple-500 focus:outline-none`}
      />
      <button
        type="button"
        disabled={!dirty}
        onClick={() => onSave(parsed)}
        className="rounded-md bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500 transition enabled:bg-purple-600 enabled:text-white enabled:hover:bg-purple-700 disabled:cursor-default"
      >
        Save
      </button>
    </span>
  );
}

/* ───────────────────────── page ───────────────────────── */

export default function ManageUmrahPackages() {
  const [rows, setRows] = useState<Row[]>([]);
  const [rules, setRules] = useState<RuleMap>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    setSelected(new Set());
    const [tn, abid, ruleRes] = await Promise.allSettled([
      axiosInstance.get("/umrah-packages/travel-network"),
      axiosInstance.get("/abidair/available-bookings-by-group"),
      axiosInstance.get("/margin-rules"),
    ]);

    const problems: string[] = [];
    const collect = (result: PromiseSettledResult<any>, name: string) => {
      if (result.status === "rejected" || !result.value.data?.success) {
        problems.push(name);
        return [];
      }
      return result.value.data.data || [];
    };

    const all = [...collect(tn, "Travel Network"), ...collect(abid, "Abid Air")]
      .map(toRow)
      .filter((r): r is Row => Boolean(r));

    // The same package must never appear twice
    const unique = new Map(all.map((r) => [r.key, r]));
    setRows([...unique.values()]);
    setRules(ruleRes.status === "fulfilled" && ruleRes.value.data?.success ? ruleRes.value.data.data || {} : {});
    setFailed(problems);
    if (problems.length) toast.warn(`Could not load: ${problems.join(", ")}`);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const ruleOf = (key: string): RuleLevel => rules[key] || DEFAULT_RULE;

  // Writes come back as { ruleKey: {margin, visible} }; defaults mean "no rule".
  const mergeRules = (changed: RuleMap) =>
    setRules((prev) => {
      const next = { ...prev };
      for (const [key, r] of Object.entries(changed)) {
        if (r.margin > 0 || r.visible === false) next[key] = r;
        else delete next[key];
      }
      return next;
    });

  const saveRule = async (
    payload: { level: "umrah-source" | "umrah-package"; source: Source; groupId?: string },
    patch: { margin?: number; visible?: boolean },
    message: string,
  ) => {
    try {
      const res = await axiosInstance.put("/margin-rules", { ...payload, ...patch });
      mergeRules({ [res.data.data.ruleKey]: res.data.data });
      toast.success(message);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save");
    }
  };

  const bulk = async (targets: Row[], visible: boolean, alsoSource?: Source) => {
    if (!targets.length && !alsoSource) return;
    setBusy(true);
    try {
      const body = [
        ...(alsoSource && visible ? [{ level: "umrah-source", source: alsoSource, visible: true }] : []),
        ...targets.map((r) => ({ level: "umrah-package", source: r.source, groupId: r.id, visible })),
      ];
      const res = await axiosInstance.put("/margin-rules/bulk", { rules: body });
      mergeRules(res.data.data);
      toast.success(`${targets.length} package(s) ${visible ? "shown to" : "hidden from"} agents`);
      setSelected(new Set());
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Bulk update failed");
    } finally {
      setBusy(false);
    }
  };

  /* derived */
  const counts = useMemo(
    () => ({
      all: rows.length,
      "travel-network": rows.filter((r) => r.source === "travel-network").length,
      abidairtravel: rows.filter((r) => r.source === "abidairtravel").length,
    }),
    [rows],
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => tab === "all" || r.source === tab)
      .filter(
        (r) =>
          !q ||
          [r.name, r.airline, r.sector, r.id, ...r.hotels.map((h) => h.name)]
            .join(" ")
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => (a.from || "").localeCompare(b.from || ""));
  }, [rows, tab, search]);

  const sourceLabel = (s: Source) => SOURCES.find((x) => x.key === s)!;
  const activeSource = tab === "all" ? null : tab;
  const sourceRule = activeSource ? ruleOf(`usrc|${activeSource}`) : null;
  const allSelected = shown.length > 0 && shown.every((r) => selected.has(r.key));
  const selectedRows = shown.filter((r) => selected.has(r.key));

  const toggleRow = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <>
      <PageMeta title="Manage Umrah Packages | Admin" description="Margin and visibility for Travel Network and Abid Air packages" />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Manage Umrah Packages</h1>
            <p className="mt-1 text-sm text-gray-500">
              Travel Network &amp; Abid Air packages — margin applies to every room type and child fare; agents only see public packages.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search packages..."
              className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
            <button
              onClick={fetchAll}
              disabled={loading}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* tabs + source margin */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "all", label: "All Packages" },
                ...SOURCES.map((s) => ({ key: s.key, label: s.label })),
              ] as { key: Tab; label: string }[]
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setSelected(new Set());
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  tab === t.key ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t.label}{" "}
                <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${tab === t.key ? "bg-white/25" : "bg-white"}`}>
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeSource && sourceRule ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
                <MarginBox
                  label="Margin (PKR):"
                  value={sourceRule.margin}
                  onSave={(margin) =>
                    saveRule(
                      { level: "umrah-source", source: activeSource },
                      { margin },
                      `Margin PKR ${margin.toLocaleString()} applied to all ${sourceLabel(activeSource).label} packages`,
                    )
                  }
                />
                <span className="text-[11px] font-semibold text-purple-700">
                  Active: PKR {sourceRule.margin.toLocaleString()}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                  <Toggle
                    checked={sourceRule.visible}
                    onChange={(visible) =>
                      saveRule(
                        { level: "umrah-source", source: activeSource },
                        { visible },
                        visible ? `${sourceLabel(activeSource).label} shown to agents` : `${sourceLabel(activeSource).label} hidden from agents`,
                      )
                    }
                  />
                  {sourceRule.visible ? "Source public" : "Source hidden"}
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">Select a source tab to set its margin</span>
            )}

            <button
              disabled={busy || !shown.length}
              onClick={() => bulk(shown, true, activeSource || undefined)}
              className="rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              Show All{tab !== "all" ? "" : ""}
            </button>
            <button
              disabled={busy || !shown.length}
              onClick={() => bulk(shown, false)}
              className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              Hide All
            </button>
          </div>
        </div>

        {/* bulk bar */}
        {selectedRows.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm">
            <span className="font-semibold text-blue-800">{selectedRows.length} selected</span>
            <button disabled={busy} onClick={() => bulk(selectedRows, true)} className="rounded-md bg-green-600 px-3 py-1 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
              Show selected
            </button>
            <button disabled={busy} onClick={() => bulk(selectedRows, false)} className="rounded-md bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
              Hide selected
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-gray-500 hover:text-gray-700">
              Clear
            </button>
          </div>
        )}

        {failed.length > 0 && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            {failed.join(" and ")} could not be loaded right now — its packages are missing from this list (not deleted).
          </div>
        )}

        {/* table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-275 border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-xs font-bold text-white">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(shown.map((r) => r.key)))}
                  />
                </th>
                <th className="px-3 py-3">Package</th>
                <th className="px-3 py-3">Departure</th>
                <th className="px-3 py-3">Price (PKR)</th>
                <th className="px-3 py-3">Sector</th>
                <th className="px-3 py-3">Hotels</th>
                <th className="px-3 py-3 text-center">Public</th>
                <th className="px-3 py-3">Package margin</th>
                <th className="px-3 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400">Loading packages…</td>
                </tr>
              ) : shown.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400">No packages match</td>
                </tr>
              ) : (
                shown.map((r) => {
                  const src = ruleOf(r.sourceKey);
                  const pkg = ruleOf(r.packageKey);
                  const margin = src.margin + pkg.margin;
                  const hiddenBy = [!src.visible && "source", !pkg.visible && "package"].filter(Boolean) as string[];
                  const meta = sourceLabel(r.source);
                  const cols: [string, keyof Row["rates"]][] = [
                    ["Dbl", "double"],
                    ["Trp", "triple"],
                    ["Quad", "quad"],
                    ["Shr", "sharing"],
                  ];

                  return (
                    <tr key={r.key} className={`border-t border-gray-100 align-top ${hiddenBy.length ? "bg-gray-50" : "bg-white hover:bg-purple-50/30"}`}>
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selected.has(r.key)} onChange={() => toggleRow(r.key)} />
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-start gap-3">
                          {r.logo ? <img src={r.logo} alt="" className="h-10 w-10 rounded object-contain" /> : null}
                          <div>
                            <div className="font-bold text-gray-900">{r.name}</div>
                            <div className="text-xs text-gray-500">
                              {r.airline && <span className="mr-2">{r.airline}</span>}
                              ID: <span className="font-semibold text-blue-600">{r.id.length > 10 ? `…${r.id.slice(-6)}` : r.id}</span>
                              {r.days > 0 && <span className="ml-2">Days: {r.days}</span>}
                            </div>
                            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badge}`}>{meta.label}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-xs">
                        <div className="font-semibold text-green-600">From: {fmtDate(r.from)}</div>
                        <div className="font-semibold text-red-500">To: {fmtDate(r.to)}</div>
                      </td>

                      <td className="px-3 py-3">
                        <table className="w-full min-w-64 border-collapse overflow-hidden rounded-lg border border-gray-200 text-xs">
                          <thead>
                            <tr className="bg-gray-50 font-bold">
                              <th className="px-2 py-1 text-left">Type</th>
                              {cols.map(([l]) => <th key={l} className="px-2 py-1 text-right">{l}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-2 py-1 font-bold text-green-600">Sell</td>
                              {cols.map(([l, k]) => <td key={l} className="px-2 py-1 text-right font-semibold text-green-700">{money(r.rates[k])}</td>)}
                            </tr>
                            <tr className="bg-purple-50">
                              <td className="px-2 py-1 font-bold text-purple-700">+Margin</td>
                              {cols.map(([l, k]) => (
                                <td key={l} className="px-2 py-1 text-right font-semibold text-purple-700">
                                  {r.rates[k] > 0 ? money(r.rates[k] + margin) : "—"}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                        <div className="mt-1 text-[10px] text-gray-400">
                          margin {src.margin.toLocaleString()} (source) + {pkg.margin.toLocaleString()} (package)
                        </div>
                      </td>

                      <td className="px-3 py-3 text-xs font-bold text-gray-800">{r.sector || "—"}</td>

                      <td className="px-3 py-3">
                        {r.hotels.length === 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <table className="w-full min-w-48 border-collapse text-[11px]">
                            <tbody>
                              {r.hotels.map((h, i) => (
                                <tr key={i} className="border-b border-gray-100 last:border-0">
                                  <td className="py-1 pr-2 font-semibold uppercase text-gray-800">{h.name || "—"}</td>
                                  <td className="py-1 pr-2 font-bold uppercase text-gray-600">{h.city}</td>
                                  <td className="py-1 text-gray-500">{h.dist}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>

                      <td className="px-3 py-3 text-center">
                        <Toggle
                          checked={pkg.visible}
                          onChange={(visible) =>
                            saveRule(
                              { level: "umrah-package", source: r.source, groupId: r.id },
                              { visible },
                              visible ? "Package shown to agents" : "Package hidden from agents",
                            )
                          }
                        />
                        {hiddenBy.length > 0 && (
                          <div className="mt-1 text-[10px] font-bold text-red-500">Hidden ({hiddenBy.join(", ")})</div>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <MarginBox
                          width="w-20"
                          value={pkg.margin}
                          onSave={(m) =>
                            saveRule(
                              { level: "umrah-package", source: r.source, groupId: r.id },
                              { margin: m },
                              `Package margin PKR ${m.toLocaleString()} saved`,
                            )
                          }
                        />
                      </td>

                      <td className="px-3 py-3 text-center">
                        <Link
                          to="/umrah-package-bookings"
                          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"
                        >
                          Bookings
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
