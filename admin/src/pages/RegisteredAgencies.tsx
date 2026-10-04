import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowDownTrayIcon, ArrowUpTrayIcon, ChevronDownIcon, ClockIcon,
  EllipsisVerticalIcon, MagnifyingGlassIcon, PlusIcon, UserGroupIcon,
  UserMinusIcon, UsersIcon,
} from "@heroicons/react/24/outline";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import { frontendUrl } from "../utils/frontendUrl";
import { toast } from "react-toastify";
import "./registered-agents.css";

type Status = "Active" | "Pending" | "Inactive";
interface Agent {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  agencyCode?: string;
  role: string;
  status: Status;
  city?: string;
  createdAt: string;
  activatedBy?: string;
  priceOnCall?: boolean;
  showHideButton?: boolean;
  marginType?: "Percentage" | "Amount";
  flightMarginPercent?: number;
  flightMarginAmount?: number;
  margin?: string;
  plainPassword?: string;
}

const auth = () => ({ Authorization: `Bearer ${sessionStorage.getItem("admin_token")}` });
const dateLabel = (date: string) => new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const initials = (name: string) => name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase();
const percentage = (count: number, total: number) => total ? Math.round(count / total * 100) : 0;

export default function RegisteredAgencies() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("All");
  const [status, setStatus] = useState("All");
  const [agency, setAgency] = useState("All");
  const [priceFilter, setPriceFilter] = useState("All");
  const [period, setPeriod] = useState("This Month");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showColumns, setShowColumns] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  useEffect(() => {
    if (!menu && !showColumns) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (menu && !event.target.closest("[data-agent-actions]")) setMenu(null);
      if (showColumns && !event.target.closest("[data-agent-columns]")) setShowColumns(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(null);
        setShowColumns(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu, showColumns]);

  const load = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/auth/users", { headers: auth() });
      if (response.data.success) setUsers(response.data.data);
    } catch {
      toast.error("Could not load agents");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const agents = useMemo(() => users.filter(user => user.role === "Agency"), [users]);
  const filtered = useMemo(() => agents.filter(user => {
    const term = query.toLowerCase();
    return (!term || [user.name, user.email, user.phone, user.companyName, user.agencyCode, user.city]
      .some(value => value?.toLowerCase().includes(term))) &&
      (city === "All" || user.city === city) &&
      (status === "All" || user.status === status) &&
      (agency === "All" || user.companyName === agency) &&
      (priceFilter === "All" || Boolean(user.priceOnCall) === (priceFilter === "On"));
  }), [agents, query, city, status, agency, priceFilter]);
  const cities = useMemo(() => [...new Set(agents.map(user => user.city).filter((value): value is string => Boolean(value)))].sort(), [agents]);
  const agencies = useMemo(() => [...new Set(agents.map(user => user.companyName).filter((value): value is string => Boolean(value)))].sort(), [agents]);
  const cityCounts = useMemo(() => {
    const source = period === "This Month"
      ? agents.filter(user => { const date = new Date(user.createdAt); const today = new Date(); return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear(); })
      : agents;
    return cities.map(name => ({ name, count: source.filter(user => user.city === name).length })).filter(item => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 7);
  }, [agents, cities, period]);
  const agencyCounts = useMemo(() => agencies.map(name => ({ name, count: agents.filter(user => user.companyName === name).length })).sort((a, b) => b.count - a.count).slice(0, 5), [agents, agencies]);
  const active = agents.filter(user => user.status === "Active").length;
  const pending = agents.filter(user => user.status === "Pending").length;
  const inactive = agents.filter(user => user.status === "Inactive").length;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allPrice = agents.length > 0 && agents.every(user => user.priceOnCall);
  const allBooking = agents.length > 0 && agents.every(user => user.showHideButton);
  const col = (name: string) => !hiddenColumns.includes(name);

  const patchAgent = async (id: string, path: string, body: object, apply: (agent: Agent) => Agent) => {
    try {
      setBusy(id);
      const response = await axiosInstance.patch(path, body, { headers: auth() });
      if (!response.data.success) throw new Error("Update failed");
      setUsers(prev => prev.map(user => user._id === id ? apply(user) : user));
      toast.success("Agent updated");
    } catch {
      toast.error("Could not update agent");
    } finally {
      setBusy(null);
    }
  };
  const setAgentStatus = (user: Agent, value: Status) => patchAgent(user._id, `/auth/users/${user._id}/status`, { status: value }, agent => ({ ...agent, status: value }));
  const togglePrice = (user: Agent) => patchAgent(user._id, `/auth/users/${user._id}/price-on-call`, { priceOnCall: !user.priceOnCall }, agent => ({ ...agent, priceOnCall: !user.priceOnCall }));
  const toggleBooking = (user: Agent) => patchAgent(user._id, `/auth/users/${user._id}/show-booking-now`, { showHideButton: !user.showHideButton }, agent => ({ ...agent, showHideButton: !user.showHideButton }));
  const bulkToggle = async (kind: "price" | "booking") => {
    try {
      setBusy(kind);
      const value = kind === "price" ? !allPrice : !allBooking;
      await axiosInstance.patch(kind === "price" ? "/bookings/bulkTogglePriceOnCall" : "/auth/users/bulk-show-booking-now", kind === "price" ? { value } : { showHideButton: value }, { headers: auth() });
      setUsers(prev => prev.map(user => user.role === "Agency" ? { ...user, [kind === "price" ? "priceOnCall" : "showHideButton"]: value } : user));
      toast.success("All agents updated");
    } catch { toast.error("Could not update agents"); }
    finally { setBusy(null); }
  };
  const download = async (type: "pdf" | "excel") => {
    try {
      setBusy(type);
      const params = new URLSearchParams({ searchTerm: query, city, status });
      const response = await axiosInstance.get(`/export/users/${type}?${params}`, { headers: auth(), responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `agents-${Date.now()}.${type === "pdf" ? "pdf" : "xlsx"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { toast.error(`Could not export ${type.toUpperCase()}`); }
    finally { setBusy(null); }
  };
  const sendCredentials = async (user: Agent) => {
    try {
      setBusy(user._id);
      await axiosInstance.post(`/auth/users/${user._id}/send-credentials`, {}, { headers: auth() });
      toast.success("Credentials sent");
    } catch { toast.error("Could not send credentials"); }
    finally { setBusy(null); setMenu(null); }
  };
  const login = (user: Agent) => {
    if (!user.agencyCode || !user.email || !user.plainPassword) { toast.error("Agent login credentials are unavailable"); return; }
    const url = frontendUrl("/auth/login");
    url.search = new URLSearchParams({ agentCode: user.agencyCode, email: user.email, password: user.plainPassword, auto: "true" }).toString();
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };
  const reset = () => { setCity("All"); setStatus("All"); setAgency("All"); setPriceFilter("All"); setSearch(""); setQuery(""); setPage(1); };
  const columns = ["Agency", "City", "Margin", "Status", "Register Date", "Price on Call", "Booking Now"];

  return <div className="registered-agents">
    <PageMeta title="All Agents" description="Manage registered travel agents" />
    <div className="ra-heading">
      <div><h1>All Agents</h1><p>Manage travel agents, view status, control access and monitor activity.</p></div>
      <div className="ra-heading-right">
        <div className="ra-breadcrumb">Home <span>›</span> Agents <span>›</span> <b>All Agents</b></div>
        <div className="ra-heading-actions">
          <button className="ra-outline" onClick={() => toast.info("Agent import is not configured yet")}><ArrowUpTrayIcon /> Import Agents</button>
          <button className="ra-outline" onClick={() => download("excel")} disabled={busy === "excel"}><ArrowDownTrayIcon /> Export Agents</button>
          <button className="ra-primary" onClick={() => window.open(frontendUrl("/auth/register").toString(), "_blank", "noopener,noreferrer")}><PlusIcon /> Add Agent</button>
        </div>
      </div>
    </div>

    <section className="ra-stats" aria-label="Agent summary">
      <div className="ra-card ra-stat"><span className="ra-stat-icon green"><UserGroupIcon /></span><div><label>Total Agents</label><strong>{agents.length.toLocaleString()}</strong><small>All registered agents</small></div></div>
      <div className="ra-card ra-stat"><span className="ra-stat-icon blue"><UsersIcon /></span><div><label>Active Agents</label><strong>{active.toLocaleString()}</strong><small>Currently active</small></div><span className="ra-progress" style={{ background: `conic-gradient(#1464fa ${percentage(active, agents.length)}%, #e9f1fc 0)` }}>{percentage(active, agents.length)}%</span></div>
      <div className="ra-card ra-stat"><span className="ra-stat-icon amber"><ClockIcon /></span><div><label>Pending Agents</label><strong>{pending.toLocaleString()}</strong><small>Awaiting approval</small></div></div>
      <div className="ra-card ra-stat"><span className="ra-stat-icon red"><UserMinusIcon /></span><div><label>De-Active Agents</label><strong>{inactive.toLocaleString()}</strong><small>Inactive accounts</small></div></div>
    </section>

    <section className="ra-insights">
      <div className="ra-card ra-city"><div className="ra-card-heading"><h2>Agents by City</h2><select value={period} onChange={e => setPeriod(e.target.value)} aria-label="Chart period"><option>This Month</option><option>All Time</option></select></div>
        <div className="ra-chart"><div className="ra-chart-axis"><span>{Math.max(...cityCounts.map(item => item.count), 0)}</span><span>0</span></div><div className="ra-bars">{cityCounts.length ? cityCounts.map(item => <div className="ra-bar-item" key={item.name}><div className="ra-bar" title={`${item.name}: ${item.count}`} style={{ height: `${Math.max(4, item.count / Math.max(...cityCounts.map(row => row.count)) * 100)}%` }} /><span>{item.name}</span></div>) : <p className="ra-empty">No city data yet</p>}</div></div>
      </div>
      <div className="ra-card ra-status"><h2>Agent Status</h2><div className="ra-status-body"><div className="ra-donut" style={{ background: agents.length ? `conic-gradient(#19bd72 0 ${percentage(active, agents.length)}%, #ffa327 ${percentage(active, agents.length)}% ${percentage(active + pending, agents.length)}%, #fa263e ${percentage(active + pending, agents.length)}% 100%)` : "#e8eef6" }}><div><strong>{agents.length.toLocaleString()}</strong><small>Total Agents</small></div></div><div className="ra-legend"><div><i className="green" />Active <span>{active} ({percentage(active, agents.length)}%)</span></div><div><i className="amber" />Pending <span>{pending} ({percentage(pending, agents.length)}%)</span></div><div><i className="red" />De-Active <span>{inactive} ({percentage(inactive, agents.length)}%)</span></div></div></div></div>
      <div className="ra-card ra-agencies"><div className="ra-card-heading"><h2>Top Agencies</h2><button onClick={() => { setAgency("All"); document.getElementById("agent-table")?.scrollIntoView({ behavior: "smooth" }); }}>View All</button></div><div className="ra-agency-list">{agencyCounts.length ? agencyCounts.map((item, index) => <div className="ra-agency" key={item.name}><span title={item.name}>{item.name}</span><div><i style={{ width: `${item.count / (agencyCounts[0]?.count || 1) * 100}%`, background: ["#79a9fa", "#54c991", "#ffbc68", "#3d87fa", "#43b7e8"][index] }} /></div><b>{item.count}</b></div>) : <p className="ra-empty">No agencies yet</p>}</div></div>
    </section>

    <section className="ra-card ra-table-card" id="agent-table">
      <div className="ra-filters">
        <label>City<select value={city} onChange={e => { setCity(e.target.value); setPage(1); }}><option value="All">All Cities</option>{cities.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Status<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="All">All Status</option><option>Active</option><option>Pending</option><option value="Inactive">De-Active</option></select></label>
        <label>Agency<select value={agency} onChange={e => { setAgency(e.target.value); setPage(1); }}><option value="All">All Agencies</option>{agencies.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Price on Call<select value={priceFilter} onChange={e => { setPriceFilter(e.target.value); setPage(1); }}><option value="All">All</option><option value="On">On</option><option value="Off">Off</option></select></label>
        <label className="ra-search-label">Search<div className="ra-search"><MagnifyingGlassIcon /><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && (setQuery(search), setPage(1))} placeholder="Search by name, email, phone, agency..." /></div></label>
        <button className="ra-primary" onClick={() => { setQuery(search); setPage(1); }}><MagnifyingGlassIcon /> Search</button>
        <button className="ra-reset" onClick={reset}>Reset</button>
      </div>
      <div className="ra-toolbar"><div>Show <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}><option>10</option><option>25</option><option>50</option><option>100</option></select> entries <span className="ra-count">{filtered.length} agents</span></div><div className="ra-toolbar-actions">
        {selected.length > 0 && <span className="ra-count">{selected.length} selected</span>}
        <button className="ra-purple" disabled={Boolean(busy) || !agents.length} onClick={() => bulkToggle("price")}>Price On Call: ALL {allPrice ? "OFF" : "ON"}</button>
        <button className="ra-primary" disabled={Boolean(busy) || !agents.length} onClick={() => bulkToggle("booking")}>Booking Now: ALL {allBooking ? "OFF" : "ON"}</button>
        <button className="ra-pdf" disabled={busy === "pdf"} onClick={() => download("pdf")}><ArrowDownTrayIcon /> PDF</button>
        <button className="ra-excel" disabled={busy === "excel"} onClick={() => download("excel")}><ArrowDownTrayIcon /> Excel</button>
        <div className="ra-columns" data-agent-columns><button className="ra-reset" onClick={() => setShowColumns(!showColumns)}>Columns <ChevronDownIcon /></button>{showColumns && <div className="ra-columns-menu">{columns.map(name => <label key={name}><input type="checkbox" checked={col(name)} onChange={() => setHiddenColumns(prev => col(name) ? [...prev, name] : prev.filter(value => value !== name))} /> {name}</label>)}</div>}</div>
      </div></div>
      <div className={`ra-table-scroll ${menu ? "menu-open" : ""}`}><table><thead><tr><th><input type="checkbox" aria-label="Select page" checked={rows.length > 0 && rows.every(row => selected.includes(row._id))} onChange={e => setSelected(e.target.checked ? [...new Set([...selected, ...rows.map(row => row._id)])] : selected.filter(id => !rows.some(row => row._id === id)))} /></th><th>#</th><th>User / Contact</th>{col("Agency") && <th>Agency</th>}{col("City") && <th>City</th>}{col("Margin") && <th>Margin</th>}{col("Status") && <th>Status</th>}{col("Register Date") && <th>Register Date</th>}{col("Price on Call") && <th>Price on Call</th>}{col("Booking Now") && <th>Booking Now</th>}<th>Action</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={11} className="ra-message">Loading agents...</td></tr> : rows.length === 0 ? <tr><td colSpan={11} className="ra-message">No agents found</td></tr> : rows.map((user, index) => <tr key={user._id}><td><input type="checkbox" aria-label={`Select ${user.name}`} checked={selected.includes(user._id)} onChange={e => setSelected(e.target.checked ? [...selected, user._id] : selected.filter(id => id !== user._id))} /></td><td>{(page - 1) * pageSize + index + 1}</td><td><div className="ra-person"><span className="ra-avatar">{initials(user.name)}</span><div><b>{user.name}</b><small>{user.phone || user.email}</small><small>{user.agencyCode || "No agent code"}</small></div></div></td>{col("Agency") && <td>{user.companyName || "—"}</td>}{col("City") && <td>{user.city || "—"}</td>}{col("Margin") && <td>{user.marginType === "Amount" ? `${user.flightMarginAmount || 0} PKR` : user.marginType === "Percentage" ? `${user.flightMarginPercent || 0}%` : user.margin || "0%"}</td>}{col("Status") && <td><span className={`ra-badge ${user.status.toLowerCase()}`}>{user.status === "Inactive" ? "De-Active" : user.status}</span></td>}{col("Register Date") && <td>{dateLabel(user.createdAt)}<small className="ra-by">by {user.activatedBy || "Admin"}</small></td>}{col("Price on Call") && <td><button className={`ra-switch ${user.priceOnCall ? "on" : ""}`} role="switch" aria-checked={Boolean(user.priceOnCall)} aria-label={`Price on call for ${user.name}`} disabled={busy === user._id} onClick={() => togglePrice(user)}><span />{user.priceOnCall ? "ON" : "OFF"}</button></td>}{col("Booking Now") && <td><button className={`ra-switch ${user.showHideButton ? "on" : ""}`} role="switch" aria-checked={Boolean(user.showHideButton)} aria-label={`Booking now for ${user.name}`} disabled={busy === user._id} onClick={() => toggleBooking(user)}><span />{user.showHideButton ? "ON" : "OFF"}</button></td>}<td><div className="ra-row-actions"><button className="ra-login" disabled={busy === user._id} onClick={() => user.status === "Active" ? login(user) : setAgentStatus(user, "Active")}>{user.status === "Active" ? "Login" : user.status === "Pending" ? "Approve" : "Activate"}</button><div className="ra-menu-wrap" data-agent-actions><button className="ra-dots" aria-label={`More actions for ${user.name}`} aria-expanded={menu === user._id} onClick={() => setMenu(menu === user._id ? null : user._id)}><EllipsisVerticalIcon /></button>{menu === user._id && <div className="ra-menu"><button onClick={() => navigate(`/registered-agencies/${user._id}`)}>View Details</button><button onClick={() => navigate(`/registered-agencies/${user._id}`)}>Edit Agent</button><button onClick={() => void sendCredentials(user)}>Send Credentials</button><button onClick={() => login(user)}>Login as Agent</button><button className="danger" onClick={() => { void setAgentStatus(user, user.status === "Active" ? "Inactive" : "Active"); setMenu(null); }}>{user.status === "Active" ? "De-activate Agent" : "Activate Agent"}</button></div>}</div></div></td></tr>)}
      </tbody></table></div>
      <div className="ra-pagination"><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span><div><button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pages}</span><button disabled={page === pages} onClick={() => setPage(page + 1)}>Next</button></div></div>
    </section>
  </div>;
}
