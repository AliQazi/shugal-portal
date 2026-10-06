import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { FaRegBuilding, FaStar } from "react-icons/fa";
import {
  FiArrowDown, FiArrowUp, FiChevronDown, FiChevronLeft, FiChevronRight,
  FiChevronUp, FiEdit2, FiLink, FiMapPin, FiMaximize2, FiPlus,
  FiRotateCcw, FiSearch, FiTrash2, FiX,
} from "react-icons/fi";
import axiosInstance from "../../Api/axios";
import { toast } from "react-toastify";
import PageMeta from "../../components/common/PageMeta";
import "./hotel-management.css";

interface Hotel {
  _id: string;
  name: string;
  city: string;
  distance: number;
  rating: number;
  mapUrl: string;
}

const emptyForm = { name: "", city: "", distance: 0, rating: 0, mapUrl: "" };

export default function HotelManagement() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<{ key: "name" | "rating"; direction: "asc" | "desc" } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const formCard = useRef<HTMLElement>(null);

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/hotels");
      if (res.data.success) setHotels(res.data.data);
    } catch {
      toast.error("Failed to fetch hotels");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "distance" || name === "rating" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Hotel name is required");
    if (!form.city.trim()) return toast.error("City is required");
    setSubmitting(true);
    try {
      if (editId) {
        const res = await axiosInstance.put("/hotels", { id: editId, ...form });
        if (res.data.success) {
          toast.success("Hotel updated");
          setHotels((prev) => prev.map((h) => (h._id === editId ? res.data.data : h)));
          cancelEdit();
        }
      } else {
        const res = await axiosInstance.post("/hotels", form);
        if (res.data.success) {
          toast.success("Hotel added");
          setHotels((prev) => [res.data.data, ...prev]);
          setForm(emptyForm);
        }
      }
    } catch {
      toast.error("Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (hotel: Hotel) => {
    setFormOpen(true);
    setEditId(hotel._id);
    setForm({ name: hotel.name, city: hotel.city, distance: hotel.distance, rating: hotel.rating, mapUrl: hotel.mapUrl });
    focusForm();
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this hotel?")) return;
    setDeletingId(id);
    try {
      const res = await axiosInstance.delete("/hotels", { data: { id } });
      if (res.data.success) {
        toast.success("Hotel deleted");
        setHotels((prev) => prev.filter((h) => h._id !== id));
        if (editId === id) cancelEdit();
      }
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const focusForm = () => {
    requestAnimationFrame(() => {
      formCard.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
      nameInput.current?.focus({ preventScroll: true });
    });
  };

  const cities = [...new Set(hotels.map((hotel) => hotel.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const averageRating = hotels.length ? (hotels.reduce((total, hotel) => total + Number(hotel.rating || 0), 0) / hotels.length).toFixed(1) : "0.0";
  const filteredHotels = hotels.filter((hotel) => {
    const query = search.trim().toLowerCase();
    return (!cityFilter || hotel.city === cityFilter) && (!query || `${hotel.name} ${hotel.city}`.toLowerCase().includes(query));
  }).sort((a, b) => {
    if (!sort) return 0;
    const comparison = sort.key === "name" ? a.name.localeCompare(b.name) : a.rating - b.rating;
    return sort.direction === "asc" ? comparison : -comparison;
  });
  const pageCount = Math.max(1, Math.ceil(filteredHotels.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * pageSize;
  const visibleHotels = filteredHotels.slice(firstIndex, firstIndex + pageSize);
  const toggleSort = (key: "name" | "rating") => {
    setSort((previous) => ({ key, direction: previous?.key === key && previous.direction === "asc" ? "desc" : "asc" }));
    setPage(1);
  };

  return (
    <div className="hotel-management">
      <PageMeta title="Hotel Management | Stack Works Flow" description="Add, update and manage your Umrah hotels." />
      <header className="hm-heading">
        <div className="hm-page-title">
          <span className="hm-heading-icon"><FaRegBuilding aria-hidden="true" /></span>
          <div><h1>Hotel Management</h1><p>Add, update and manage all hotels</p></div>
        </div>
        <div className="hm-stats" aria-label="Hotel summary">
          {[
            { label: "Total Hotels", value: hotels.length, icon: FaRegBuilding, tone: "blue" },
            { label: "Cities", value: cities.length, icon: FiMapPin, tone: "green" },
            { label: "Mapped Hotels", value: hotels.filter((hotel) => hotel.mapUrl).length, icon: FiLink, tone: "rose" },
            { label: "Avg. Rating", value: averageRating, icon: FaStar, tone: "amber" },
          ].map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="hm-stat">
              <span className={`hm-stat-icon hm-tone-${tone}`}><Icon aria-hidden="true" /></span>
              <div><span>{label}</span><strong>{loading ? "—" : value}</strong></div>
            </div>
          ))}
        </div>
        <div className="hm-heading-actions">
          <nav aria-label="Breadcrumb" className="hm-breadcrumb"><Link to="/">Home</Link><FiChevronRight aria-hidden="true" /><span aria-current="page">Hotels</span></nav>
          <button type="button" className="hm-button hm-button-primary" disabled={submitting} onClick={() => { cancelEdit(); setFormOpen(true); focusForm(); }}><FiPlus aria-hidden="true" />Add Hotel</button>
        </div>
      </header>

      <section className="hm-card hm-form-card" ref={formCard} aria-labelledby="hm-form-heading">
        <div className="hm-card-heading">
          <div className="hm-card-title">
            <span className="hm-section-icon"><FaRegBuilding aria-hidden="true" /></span>
            <div><h2 id="hm-form-heading">{editId ? "Edit Hotel" : "Add New Hotel"}</h2><p>{editId ? "Update the details of your selected hotel" : "Fill in the details to add a new hotel to your system"}</p></div>
          </div>
          <button type="button" className="hm-collapse" aria-expanded={formOpen} aria-controls="hm-hotel-form" aria-label={formOpen ? "Collapse hotel form" : "Expand hotel form"} onClick={() => setFormOpen((previous) => !previous)}>
            {formOpen ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
          </button>
        </div>
        <form id="hm-hotel-form" onSubmit={handleSubmit} hidden={!formOpen}>
          <div className="hm-form-grid">
            <div className="hm-field hm-field-wide">
              <label htmlFor="hm-name">Hotel Name <span>*</span></label>
              <div className="hm-input-wrap"><span className="hm-input-icon"><FaRegBuilding aria-hidden="true" /></span><input id="hm-name" ref={nameInput} name="name" value={form.name} onChange={handleChange} placeholder="Enter hotel name" required disabled={submitting} /></div>
            </div>
            <div className="hm-field hm-field-wide">
              <label htmlFor="hm-city">City <span>*</span></label>
              <div className="hm-input-wrap"><span className="hm-input-icon"><FiMapPin aria-hidden="true" /></span><input id="hm-city" name="city" value={form.city} onChange={handleChange} placeholder="Enter city" required disabled={submitting} /></div>
            </div>
            <div className="hm-field">
              <label htmlFor="hm-distance">Distance from Center (m)</label>
              <div className="hm-input-wrap"><span className="hm-input-icon"><FiMaximize2 aria-hidden="true" /></span><input id="hm-distance" name="distance" type="number" min={0} value={form.distance} onChange={handleChange} placeholder="Distance" disabled={submitting} /><span className="hm-input-unit">m</span></div>
            </div>
            <div className="hm-field">
              <label htmlFor="hm-rating">Rating</label>
              <div className="hm-input-wrap"><span className="hm-input-icon"><FaStar aria-hidden="true" /></span><input id="hm-rating" name="rating" type="number" min={0} max={5} step={0.5} value={form.rating} onChange={handleChange} disabled={submitting} /></div>
            </div>
            <div className="hm-field hm-field-wide">
              <label htmlFor="hm-map-url">Map URL</label>
              <div className="hm-input-wrap"><span className="hm-input-icon"><FiLink aria-hidden="true" /></span><input id="hm-map-url" name="mapUrl" value={form.mapUrl} onChange={handleChange} placeholder="Paste Google map link" disabled={submitting} /></div>
            </div>
          </div>
          <div className="hm-form-actions">
            <button type="submit" disabled={submitting} className="hm-button hm-button-primary"><FiPlus aria-hidden="true" />{submitting ? "Saving..." : editId ? "Update Hotel" : "Add Hotel"}</button>
            <button type="button" disabled={submitting} onClick={cancelEdit} className="hm-button hm-button-secondary">{editId ? <FiX aria-hidden="true" /> : <FiRotateCcw aria-hidden="true" />}{editId ? "Cancel" : "Reset"}</button>
          </div>
        </form>
      </section>

      <section className="hm-card hm-list-card" aria-labelledby="hm-list-heading" aria-busy={loading}>
        <div className="hm-list-heading">
          <div className="hm-card-title">
            <span className="hm-section-icon"><FaRegBuilding aria-hidden="true" /></span>
            <div><h2 id="hm-list-heading">All Hotels</h2><p>View, search, filter and manage all hotels</p></div>
          </div>
          <div className="hm-toolbar">
            <label className="hm-search"><FiSearch aria-hidden="true" /><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by hotel name or city..." aria-label="Search hotels" /></label>
            <select className="hm-select" value={cityFilter} onChange={(event) => { setCityFilter(event.target.value); setPage(1); }} aria-label="Filter hotels by city">
              <option value="">All Cities</option>
              {cities.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
            {(search || cityFilter) && <button type="button" className="hm-button hm-button-secondary" onClick={() => { setSearch(""); setCityFilter(""); setPage(1); }}><FiX aria-hidden="true" />Clear</button>}
          </div>
        </div>
        <div className="hm-table-scroll" role="region" aria-label="Hotels table" tabIndex={0}>
          <table className="hm-table">
            <thead><tr>
              <th scope="col" aria-sort={sort?.key === "name" ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button type="button" className="hm-sort" onClick={() => toggleSort("name")}>Hotel Name{sort?.key === "name" && sort.direction === "desc" ? <FiArrowDown aria-hidden="true" /> : <FiArrowUp aria-hidden="true" />}</button></th>
              <th scope="col">City</th>
              <th scope="col">Distance (m)</th>
              <th scope="col" aria-sort={sort?.key === "rating" ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button type="button" className="hm-sort" onClick={() => toggleSort("rating")}>Rating{sort?.key === "rating" && sort.direction === "desc" ? <FiArrowDown aria-hidden="true" /> : <FiArrowUp aria-hidden="true" />}</button></th>
              <th scope="col">Map</th>
              <th scope="col">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="hm-empty" role="status">Loading hotels...</td></tr> : !visibleHotels.length ? <tr><td colSpan={6} className="hm-empty"><FaRegBuilding aria-hidden="true" /><strong>{hotels.length ? "No matching hotels" : "No hotels yet"}</strong><span>{hotels.length ? "Try another hotel name or city." : "Add your first hotel using the form above."}</span></td></tr> : visibleHotels.map((hotel) => (
                <tr key={hotel._id}>
                  <td><div className="hm-hotel-name"><span className="hm-hotel-icon"><FaRegBuilding aria-hidden="true" /></span><strong>{hotel.name}</strong></div></td>
                  <td><span className="hm-city"><FiMapPin aria-hidden="true" />{hotel.city}</span></td>
                  <td>{hotel.distance.toLocaleString()} <span className="hm-muted">m</span></td>
                  <td><span className="hm-rating"><FaStar aria-hidden="true" />{hotel.rating}</span></td>
                  <td>{hotel.mapUrl ? <a className="hm-map-link" href={hotel.mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open map for ${hotel.name}`} title="Open map"><FiMapPin aria-hidden="true" /></a> : <span className="hm-muted" aria-label="No map link">—</span>}</td>
                  <td><div className="hm-row-actions">
                    <button type="button" onClick={() => handleEdit(hotel)} disabled={submitting || deletingId !== null} className="hm-action" aria-label={`Edit ${hotel.name}`} title="Edit hotel"><FiEdit2 aria-hidden="true" /></button>
                    <button type="button" onClick={() => handleDelete(hotel._id)} disabled={submitting || deletingId !== null} className="hm-action hm-action-danger" aria-label={`Delete ${hotel.name}`} title="Delete hotel"><FiTrash2 aria-hidden="true" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="hm-pagination">
          <p aria-live="polite">{loading ? "Loading hotels..." : filteredHotels.length ? `Showing ${firstIndex + 1} to ${Math.min(firstIndex + pageSize, filteredHotels.length)} of ${filteredHotels.length} hotels` : "Showing 0 hotels"}</p>
          <div className="hm-pagination-controls">
            <select className="hm-select hm-page-size" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} aria-label="Hotels per page">{[10, 25, 50].map((size) => <option value={size} key={size}>{size}</option>)}</select>
            <button type="button" className="hm-page-button" disabled={currentPage === 1 || loading} onClick={() => setPage(currentPage - 1)} aria-label="Previous page"><FiChevronLeft aria-hidden="true" /></button>
            {Array.from({ length: Math.min(5, pageCount) }, (_, index) => Math.min(Math.max(currentPage - 2, 1), Math.max(pageCount - 4, 1)) + index).map((number) => <button type="button" key={number} className={`hm-page-button${number === currentPage ? " is-current" : ""}`} disabled={loading} aria-label={`Page ${number}`} aria-current={number === currentPage ? "page" : undefined} onClick={() => setPage(number)}>{number}</button>)}
            <button type="button" className="hm-page-button" disabled={currentPage === pageCount || loading} onClick={() => setPage(currentPage + 1)} aria-label="Next page"><FiChevronRight aria-hidden="true" /></button>
          </div>
        </div>
      </section>
    </div>
  );
}
