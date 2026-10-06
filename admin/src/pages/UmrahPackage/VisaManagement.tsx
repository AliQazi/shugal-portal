import React, { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router";
import { toast } from "react-toastify";
import { TbBan, TbCalendar, TbChevronRight, TbCirclePlus, TbDatabase, TbFileDescription, TbHome, TbInbox, TbPencil, TbPlus, TbStack2, TbTrash, TbX } from "react-icons/tb";
import { FaBus, FaPassport } from "react-icons/fa";
import axiosInstance from "../../Api/axios";
import PageMeta from "../../components/common/PageMeta";
import "./visa-management.css";

interface Visa {
  _id: string;
  visaType: string;
  processingTime: number;
  buyingPrice: number;
  sellingPrice: number;
  currency: string;
  transport: "without" | "with";
  description: string;
}

const CURRENCIES = [
  "PKR — Pakistani Rupee",
  "USD — US Dollar",
  "SAR — Saudi Riyal",
  "AED — UAE Dirham",
  "GBP — British Pound",
  "EUR — Euro",
];
const emptyForm = {
  visaType: "", processingTime: 0, buyingPrice: 0, sellingPrice: 0,
  currency: "PKR", transport: "without" as "without" | "with", description: "",
};
const errorMessage = (error: unknown, fallback: string) =>
  isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : fallback;
const margin = (visa: Visa) => visa.sellingPrice > 0
  ? `${((visa.sellingPrice - visa.buyingPrice) / visa.sellingPrice * 100).toFixed(1)}%` : "—";

function VisaTable({ list, busy, deletingId, onEdit, onDelete }: {
  list: Visa[];
  busy: boolean;
  deletingId: string | null;
  onEdit: (visa: Visa) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="vm-table-scroll" role="region" aria-label="Visa packages" tabIndex={0}>
      <table className={`vm-table${list.length ? "" : " is-empty"}`}>
        <thead><tr>{["Visa Type", "Processing", "Buy Price", "Sell Price", "Margin", "Currency", "Actions"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{list.length ? list.map((visa) => (
          <tr key={visa._id}>
            <td className="vm-visa-type">{visa.visaType}</td><td>{visa.processingTime} days</td>
            <td>{visa.buyingPrice.toLocaleString()}</td><td>{visa.sellingPrice.toLocaleString()}</td>
            <td>{margin(visa)}</td><td>{visa.currency}</td>
            <td><div className="vm-row-actions">
              <button type="button" className="vm-action vm-action-edit" disabled={busy} onClick={() => onEdit(visa)} aria-label={`Edit ${visa.visaType}`}><TbPencil aria-hidden="true" />Edit</button>
              <button type="button" className="vm-action vm-action-delete" disabled={busy} onClick={() => onDelete(visa._id)} aria-label={`Delete ${visa.visaType}`}><TbTrash aria-hidden="true" />{deletingId === visa._id ? "Deleting..." : "Delete"}</button>
            </div></td>
          </tr>
        )) : <tr><td colSpan={7} className="vm-empty"><TbInbox aria-hidden="true" /><strong>No records found</strong><span>Add a visa package to get started.</span></td></tr>}</tbody>
      </table>
    </div>
  );
}

export default function VisaManagement() {
  const [visas, setVisas] = useState<Visa[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const formCard = useRef<HTMLElement>(null);
  const typeInput = useRef<HTMLInputElement>(null);
  const busy = submitting || deletingId !== null;

  const fetchVisas = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const response = await axiosInstance.get("/visas");
      if (response.data.success) setVisas(response.data.data);
      else setFetchError(response.data.message || "Failed to fetch visas");
    } catch (error) {
      setFetchError(errorMessage(error, "Failed to fetch visas"));
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchVisas(); }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: ["processingTime", "buyingPrice", "sellingPrice"].includes(name) ? Number(value) : value }));
  };
  const cancelEdit = () => { setEditId(null); setForm(emptyForm); };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!form.visaType.trim()) { toast.error("Visa type is required"); return; }
    setSubmitting(true);
    try {
      const response = editId
        ? await axiosInstance.put("/visas", { id: editId, ...form })
        : await axiosInstance.post("/visas", form);
      if (response.data.success) {
        toast.success(editId ? "Visa updated" : "Visa added");
        setVisas((previous) => editId ? previous.map((visa) => visa._id === editId ? response.data.data : visa) : [response.data.data, ...previous]);
        cancelEdit();
      } else toast.error(response.data.message || "Operation failed");
    } catch (error) { toast.error(errorMessage(error, "Operation failed")); }
    finally { setSubmitting(false); }
  };
  const handleEdit = (visa: Visa) => {
    setEditId(visa._id);
    setForm({ visaType: visa.visaType, processingTime: visa.processingTime, buyingPrice: visa.buyingPrice, sellingPrice: visa.sellingPrice, currency: visa.currency, transport: visa.transport, description: visa.description || "" });
    requestAnimationFrame(() => {
      formCard.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      typeInput.current?.focus({ preventScroll: true });
    });
  };
  const handleDelete = async (id: string) => {
    if (busy || !window.confirm("Delete this visa?")) return;
    setDeletingId(id);
    try {
      const response = await axiosInstance.delete("/visas", { data: { id } });
      if (response.data.success) {
        toast.success("Visa deleted");
        setVisas((previous) => previous.filter((visa) => visa._id !== id));
        if (editId === id) cancelEdit();
      } else toast.error(response.data.message || "Delete failed");
    } catch (error) { toast.error(errorMessage(error, "Delete failed")); }
    finally { setDeletingId(null); }
  };

  const withoutTransport = visas.filter((visa) => visa.transport === "without");
  const withTransport = visas.filter((visa) => visa.transport === "with");

  return (
    <div className="visa-management">
      <PageMeta title="Visa Management | Stack Works Flow" description="Manage Umrah visa packages and pricing." />
      <nav className="vm-breadcrumb" aria-label="Breadcrumb"><TbHome aria-hidden="true" /><Link to="/">Dashboard</Link><TbChevronRight aria-hidden="true" /><span aria-current="page">Visa Management</span></nav>
      <header className="vm-heading">
        <div className="vm-heading-title"><span className="vm-heading-icon"><FaPassport aria-hidden="true" /></span><div><h1>Visa Management</h1><p>Manage Umrah visa packages and pricing</p></div></div>
        <div className="vm-stats" aria-label="Visa summary">{[
          { label: "Total", value: visas.length, detail: "Visa packages", icon: TbStack2, tone: "blue" },
          { label: "No Transport", value: withoutTransport.length, detail: "Without transport", icon: TbBan, tone: "cyan" },
          { label: "With Transport", value: withTransport.length, detail: "With transport", icon: FaBus, tone: "green" },
        ].map(({ label, value, detail, icon: Icon, tone }) => <div className={`vm-stat vm-stat-${tone}`} key={label}><span className="vm-stat-icon"><Icon aria-hidden="true" /></span><div><strong>{loading || fetchError ? "—" : value}</strong><span>{label}</span><p>{detail}</p></div></div>)}</div>
      </header>

      <section className="vm-card vm-form-card" ref={formCard} aria-labelledby="vm-form-heading">
        <img src={`${import.meta.env.BASE_URL}images/visa/mosque-skyline.png`} alt="" className="vm-form-art" aria-hidden="true" />
        <div className="vm-card-title"><span className="vm-section-icon vm-section-icon-add"><TbCirclePlus aria-hidden="true" /></span><div><h2 id="vm-form-heading">{editId ? "Edit Visa" : "Add New Visa"}</h2><p>{editId ? "Update the visa package and its pricing details" : "Create a new Umrah visa package with pricing details"}</p></div></div>
        <form id="vm-visa-form" onSubmit={handleSubmit}>
          <div className="vm-form-grid">
            <div className="vm-field"><label htmlFor="vm-visa-type">Visa Type <span>*</span></label><div className="vm-input-wrap"><input ref={typeInput} id="vm-visa-type" name="visaType" type="text" value={form.visaType} onChange={handleChange} placeholder="e.g. Umrah 15 Days" required disabled={busy} /></div></div>
            {[
              { name: "processingTime", label: "Processing Time (Days)", icon: TbCalendar, required: false, step: "1" },
              { name: "buyingPrice", label: "Buying Price", icon: TbDatabase, required: true, step: "any" },
              { name: "sellingPrice", label: "Selling Price", icon: TbDatabase, required: true, step: "any" },
            ].map(({ name, label, icon: Icon, required, step }) => <div className="vm-field" key={name}><label htmlFor={`vm-${name}`}>{label}{required && <span> *</span>}</label><div className="vm-input-wrap"><input id={`vm-${name}`} name={name} type="number" min={0} step={step} value={form[name as "processingTime" | "buyingPrice" | "sellingPrice"]} onChange={handleChange} required={required} disabled={busy} /><Icon aria-hidden="true" /></div></div>)}
            <div className="vm-field vm-currency-field"><label htmlFor="vm-currency">Currency</label><select id="vm-currency" name="currency" value={form.currency} onChange={handleChange} disabled={busy}>
              {CURRENCIES.map((currency) => <option key={currency} value={currency.split(" — ")[0]}>{currency}</option>)}
              {!CURRENCIES.some((currency) => currency.split(" — ")[0] === form.currency) && <option value={form.currency}>{form.currency}</option>}
            </select></div>
          </div>
          <div className="vm-transport-field"><span id="vm-transport-label">Transport</span><div className="vm-transport-toggle" role="group" aria-labelledby="vm-transport-label">{(["without", "with"] as const).map((option) => <button key={option} type="button" disabled={busy} aria-pressed={form.transport === option} className={`vm-transport-option${form.transport === option ? " is-selected" : ""}`} onClick={() => setForm((previous) => ({ ...previous, transport: option }))}>{option === "without" ? <TbBan aria-hidden="true" /> : <FaBus aria-hidden="true" />}{option === "without" ? "Without" : "With"}</button>)}</div></div>
          <div className="vm-field vm-description-field"><label htmlFor="vm-description">Description</label><div className="vm-description-wrap"><TbFileDescription aria-hidden="true" /><textarea id="vm-description" name="description" value={form.description} onChange={handleChange} rows={3} disabled={busy} placeholder="Additional details, inclusions, restrictions..." /></div><span className="vm-description-count">{form.description.length} characters</span></div>
          <div className="vm-form-actions"><button type="submit" className="vm-button vm-button-primary" disabled={busy}><TbPlus aria-hidden="true" />{submitting ? "Saving..." : editId ? "Update Visa" : "Add Visa"}</button>{editId && <button type="button" className="vm-button vm-button-secondary" onClick={cancelEdit} disabled={busy}><TbX aria-hidden="true" />Cancel</button>}</div>
        </form>
      </section>

      {[
        { transport: "without", title: "Without Transport", detail: "Visa packages without transport facilities", icon: TbBan, list: withoutTransport },
        { transport: "with", title: "With Transport", detail: "Visa packages with transport facilities", icon: FaBus, list: withTransport },
      ].map(({ transport, title, detail, icon: Icon, list }) => <section key={transport} className={`vm-card vm-list-card vm-list-${transport}`} aria-labelledby={`vm-list-${transport}-heading`} aria-busy={loading}>
        <div className="vm-list-heading"><div className="vm-card-title"><span className={`vm-section-icon vm-section-icon-${transport}`}><Icon aria-hidden="true" /></span><div><h2 id={`vm-list-${transport}-heading`}>Umrah Visa — {title}</h2><p>{detail}</p></div></div><span className="vm-record-count">{loading || fetchError ? "—" : `${list.length} ${list.length === 1 ? "Record" : "Records"}`}</span></div>
        {loading ? <div className="vm-list-state" role="status">Loading visas...</div> : fetchError ? <div className="vm-list-state" role="alert"><strong>Unable to load visas</strong><p>{fetchError}</p><button type="button" className="vm-button vm-button-primary" onClick={fetchVisas}>Retry</button></div> : <VisaTable list={list} busy={busy} deletingId={deletingId} onEdit={handleEdit} onDelete={handleDelete} />}
      </section>)}
    </div>
  );
}
