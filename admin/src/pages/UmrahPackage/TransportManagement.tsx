import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  TbBus, TbCar, TbChevronLeft, TbChevronRight, TbCirclePlus,
  TbFilter, TbHome, TbListDetails, TbPencil, TbPlus, TbRotateClockwise,
  TbRoute, TbSearch, TbStar, TbTrash, TbX,
} from "react-icons/tb";
import axiosInstance from "../../Api/axios";
import { toast } from "react-toastify";
import PageMeta from "../../components/common/PageMeta";
import "./transport-management.css";

interface Transport {
  _id: string;
  route: string;
  transportType: string;
}

const emptyForm = { route: "", transportType: "" };
const vehicleCategory = (type: string) => /\bbus\b|coach/i.test(type) ? "bus" : /\bcar\b|\bgmc\b|\bsuv\b/i.test(type) ? "car" : "other";

export default function TransportManagement() {
  const [transports, setTransports] = useState<Transport[]>([]); 
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false); 
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const routeInput = useRef<HTMLInputElement>(null);
  const formCard = useRef<HTMLElement>(null);

  useEffect(() => {
    fetchTransports();  
  }, []);

  const fetchTransports = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/transports");
      if (res.data.success) setTransports(res.data.data);
    } catch {
      toast.error("Failed to fetch transports");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.route.trim()) return toast.error("Route is required");
    if (!form.transportType.trim()) return toast.error("Transport type is required");
    setSubmitting(true);
    try {
      if (editId) {
        const res = await axiosInstance.put("/transports", { id: editId, ...form });
        if (res.data.success) {
          toast.success("Transport updated");
          setTransports((prev) => prev.map((t) => (t._id === editId ? res.data.data : t)));
          cancelEdit();
        }
      } else {
        const res = await axiosInstance.post("/transports", form);
        if (res.data.success) {
          toast.success("Transport added");
          setTransports((prev) => [res.data.data, ...prev]);
          setForm(emptyForm);
        }
      }
    } catch {
      toast.error("Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (t: Transport) => {
    setEditId(t._id);
    setForm({ route: t.route, transportType: t.transportType });
    requestAnimationFrame(() => {
      formCard.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
      routeInput.current?.focus({ preventScroll: true });
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this transport?")) return;
    setDeletingId(id);
    try {
      const res = await axiosInstance.delete("/transports", { data: { id } });
      if (res.data.success) {
        toast.success("Transport deleted");
        setTransports((prev) => prev.filter((t) => t._id !== id));
        if (editId === id) cancelEdit();
      }
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const transportTypes = [...new Set(transports.map((transport) => transport.transportType))].sort((a, b) => a.localeCompare(b));
  const typeSuggestions = [...new Set(["Bus", "GMC", "Car", ...transportTypes])];
  const routeCounts = new Map<string, number>();
  transports.forEach((transport) => routeCounts.set(transport.route, (routeCounts.get(transport.route) || 0) + 1));
  const popularRoute = [...routeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const filteredTransports = transports.filter((transport) =>
    (!typeFilter || transport.transportType === typeFilter) &&
    `${transport.route} ${transport.transportType}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredTransports.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * pageSize;
  const visibleTransports = filteredTransports.slice(firstIndex, firstIndex + pageSize);

  return (
    <div className="transport-management">
      <PageMeta title="Transport Management | Stack Works Flow" description="Create, update and manage Umrah transport routes and vehicle types." />
      <header className="tm-heading">
        <div><p className="tm-eyebrow">Transport</p><h1>Transport Management</h1><p className="tm-subtitle">Create, update and manage transports</p></div>
        <nav className="tm-breadcrumb" aria-label="Breadcrumb"><Link to="/" aria-label="Home"><TbHome aria-hidden="true" /></Link><span>/</span><span>Transports</span><span>/</span><span aria-current="page">Transport Management</span></nav>
      </header>

      <div className="tm-stats" aria-label="Transport summary">
        {[
          { label: "Total Routes", value: transports.length, icon: TbRoute, tone: "blue", note: "Transport routes in your system" },
          { label: "Bus Routes", value: transports.filter((transport) => vehicleCategory(transport.transportType) === "bus").length, icon: TbBus, tone: "green", note: "Bus and coach transports" },
          { label: "Car Routes", value: transports.filter((transport) => vehicleCategory(transport.transportType) === "car").length, icon: TbCar, tone: "violet", note: "Car, GMC and SUV transports" },
          { label: "Popular Route", value: popularRoute?.[0] || "No routes yet", icon: TbStar, tone: "amber", note: popularRoute ? `${popularRoute[1]} transport${popularRoute[1] === 1 ? "" : "s"}` : "Add a route to get started" },
        ].map(({ label, value, icon: Icon, tone, note }) => (
          <div className="tm-stat" key={label}>
            <span className={`tm-stat-icon tm-tone-${tone}`}><Icon aria-hidden="true" /></span>
            <div className="tm-stat-content"><span>{label}</span><strong className={tone === "amber" ? "tm-popular-route" : ""} title={String(value)}>{loading ? "—" : value}</strong><p>{loading ? "Loading transports..." : note}</p></div>
          </div>
        ))}
      </div>

      <section ref={formCard} className="tm-card tm-form-card" aria-labelledby="tm-form-heading">
        <div className="tm-form-content">
          <div className="tm-card-title"><span className="tm-section-icon"><TbCirclePlus aria-hidden="true" /></span><div><h2 id="tm-form-heading">{editId ? "Edit Transport" : "Add Transport"}</h2><p>{editId ? "Update the selected transport route and vehicle type" : "Add a new transport route and vehicle type"}</p></div></div>
          <form onSubmit={handleSubmit} id="tm-transport-form">
            <div className="tm-form-grid">
              <div className="tm-field"><label htmlFor="tm-route">Route</label><div className="tm-input-wrap"><TbRoute aria-hidden="true" /><input ref={routeInput} id="tm-route" name="route" value={form.route} onChange={handleChange} placeholder="Makkah → Madinah" required disabled={submitting} /></div></div>
              <div className="tm-field"><label htmlFor="tm-type">Transport Type</label><div className="tm-input-wrap"><TbBus aria-hidden="true" /><input id="tm-type" name="transportType" list="tm-transport-types" value={form.transportType} onChange={handleChange} placeholder="Bus / GMC / Car" required disabled={submitting} /><datalist id="tm-transport-types">{typeSuggestions.map((type) => <option key={type} value={type} />)}</datalist></div></div>
            </div>
            <div className="tm-form-actions">
              <button type="submit" disabled={submitting || deletingId !== null} className="tm-button tm-button-primary"><TbPlus aria-hidden="true" />{submitting ? "Saving..." : editId ? "Update Transport" : "Add Transport"}</button>
              <button type="button" disabled={submitting} onClick={cancelEdit} className="tm-button tm-button-secondary">{editId ? <TbX aria-hidden="true" /> : <TbRotateClockwise aria-hidden="true" />}{editId ? "Cancel" : "Reset"}</button>
            </div>
          </form>
        </div>
        <img className="tm-form-illustration" src={`${import.meta.env.BASE_URL}images/transport/umrah-coach.png`} alt="" aria-hidden="true" />
      </section>

      <section className="tm-card tm-list-card" aria-labelledby="tm-list-heading" aria-busy={loading}>
        <div className="tm-list-heading">
          <div className="tm-card-title"><span className="tm-section-icon"><TbListDetails aria-hidden="true" /></span><div><h2 id="tm-list-heading">All Transports</h2><p>View, search and manage all transport routes</p></div></div>
          <div className="tm-toolbar">
            <label className="tm-search"><TbSearch aria-hidden="true" /><input type="search" aria-label="Search transports" placeholder="Search routes..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
            <div className="tm-filter"><TbFilter aria-hidden="true" /><select aria-label="Filter transport types" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }}><option value="">All Types</option>{transportTypes.map((type) => <option value={type} key={type}>{type}</option>)}</select></div>
            {(search || typeFilter) && <button type="button" className="tm-clear" aria-label="Clear transport filters" title="Clear filters" onClick={() => { setSearch(""); setTypeFilter(""); setPage(1); }}><TbX aria-hidden="true" /></button>}
          </div>
        </div>
        <div className="tm-table-scroll" role="region" aria-label="Transports table" tabIndex={0}>
          <table className="tm-table">
            <thead><tr><th scope="col">#</th><th scope="col">Route</th><th scope="col">Transport Type</th><th scope="col">Actions</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={4} className="tm-empty" role="status">Loading transports...</td></tr> : !visibleTransports.length ? <tr><td colSpan={4} className="tm-empty"><TbBus aria-hidden="true" /><strong>{transports.length ? "No matching transports" : "No transports yet"}</strong><span>{transports.length ? "Try a different route or transport type." : "Add your first transport route using the form above."}</span></td></tr> : visibleTransports.map((transport, index) => {
              const category = vehicleCategory(transport.transportType);
              const TypeIcon = category === "car" ? TbCar : TbBus;
              return <tr key={transport._id}>
                <td className="tm-row-number">{firstIndex + index + 1}</td><td className="tm-route-name">{transport.route}</td>
                <td><span className={`tm-type-badge tm-type-${category}`}><TypeIcon aria-hidden="true" />{transport.transportType}</span></td>
                <td><div className="tm-row-actions"><button type="button" className="tm-action tm-action-edit" aria-label={`Edit ${transport.route}`} title="Edit transport" disabled={submitting || deletingId !== null} onClick={() => handleEdit(transport)}><TbPencil aria-hidden="true" /></button><button type="button" className="tm-action tm-action-delete" aria-label={`Delete ${transport.route}`} title="Delete transport" disabled={submitting || deletingId !== null} onClick={() => handleDelete(transport._id)}><TbTrash aria-hidden="true" /></button></div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <div className="tm-pagination">
          <p aria-live="polite">{loading ? "Loading transports..." : filteredTransports.length ? `Showing ${firstIndex + 1} to ${Math.min(firstIndex + pageSize, filteredTransports.length)} of ${filteredTransports.length} transports` : "Showing 0 transports"}</p>
          <div className="tm-pagination-controls"><button type="button" className="tm-page-button" aria-label="Previous page" disabled={loading || currentPage === 1} onClick={() => setPage(currentPage - 1)}><TbChevronLeft aria-hidden="true" /></button>
            {Array.from({ length: Math.min(5, pageCount) }, (_, index) => Math.min(Math.max(currentPage - 2, 1), Math.max(pageCount - 4, 1)) + index).map((number) => <button type="button" className={`tm-page-button${number === currentPage ? " is-current" : ""}`} key={number} aria-label={`Page ${number}`} aria-current={number === currentPage ? "page" : undefined} disabled={loading} onClick={() => setPage(number)}>{number}</button>)}
            <button type="button" className="tm-page-button" aria-label="Next page" disabled={loading || currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><TbChevronRight aria-hidden="true" /></button></div>
        </div>
      </section>
    </div>
  );
}