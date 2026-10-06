import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router";
import { TbChevronRight, TbCirclePlus, TbCube, TbDatabase, TbFolder, TbHome, TbLayoutGrid, TbPencil, TbPlus, TbTrash, TbX } from "react-icons/tb";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import "./sector-management.css";

interface SectorRecord {
  _id: string;
  groupType: string;
  sectorTitle: string;
  fullSector: string;
  createdAt: string;
}

const groups = [
  { name: "UAE Groups", flag: "ae" },
  { name: "KSA Groups", flag: "sa" },
  { name: "Bahrain Groups", flag: "bh" },
  { name: "Mascat Groups", flag: "om" },
  { name: "Qatar Groups", flag: "qa" },
  { name: "UK Groups", flag: "gb" },
  { name: "Umrah Groups", flag: null },
];
const emptyForm = { groupType: "", sectorTitle: "", fullSector: "" };
const getErrorMessage = (error: unknown, fallback: string) =>
  isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : fallback;

const Sector = () => {
  const [formData, setFormData] = useState(emptyForm);
  const [sectors, setSectors] = useState<SectorRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const formCard = useRef<HTMLElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const busy = loading || deletingId !== null;

  const fetchSectors = async () => {
    setFetchLoading(true);
    setFetchError("");
    try {
      const response = await axiosInstance.get("/sector");
      if (response.data.success) setSectors(response.data.data);
      else setFetchError(response.data.message || "Failed to fetch sectors");
    } catch (error) {
      setFetchError(getErrorMessage(error, "Failed to fetch sectors"));
    } finally {
      setFetchLoading(false);
    }
  };
  useEffect(() => { fetchSectors(); }, []);

  const resetForm = () => { setFormData(emptyForm); setEditingId(null); };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!Object.values(formData).every((value) => value.trim())) {
      setMessage({ type: "error", text: "All fields are required" });
      return;
    }
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const response = editingId
        ? await axiosInstance.put(`/sector/${editingId}`, formData)
        : await axiosInstance.post("/sector/add", formData);
      if (response.data.success) {
        setMessage({ type: "success", text: editingId ? "Sector updated successfully" : "Sector added successfully" });
        setCollapsedGroups((previous) => previous.filter((name) => name !== formData.groupType));
        resetForm();
        await fetchSectors();
      } else setMessage({ type: "error", text: response.data.message || "Failed to save sector" });
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error, "Failed to save sector") });
    } finally { setLoading(false); }
  };

  const handleEdit = (sector: SectorRecord) => {
    setFormData({ groupType: sector.groupType, sectorTitle: sector.sectorTitle, fullSector: sector.fullSector });
    setEditingId(sector._id);
    setMessage({ type: "", text: "" });
    requestAnimationFrame(() => {
      formCard.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      titleInput.current?.focus({ preventScroll: true });
    });
  };
  const handleDelete = async (id: string) => {
    if (busy || !window.confirm("Are you sure you want to delete this sector?")) return;
    setDeletingId(id);
    setMessage({ type: "", text: "" });
    try {
      const response = await axiosInstance.delete(`/sector/${id}`);
      if (response.data.success) {
        setMessage({ type: "success", text: "Sector deleted successfully" });
        if (editingId === id) resetForm();
        await fetchSectors();
      } else setMessage({ type: "error", text: response.data.message || "Failed to delete sector" });
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error, "Failed to delete sector") });
    } finally { setDeletingId(null); }
  };
  const toggleGroup = (name: string) => setCollapsedGroups((previous) => previous.includes(name)
    ? previous.filter((group) => group !== name) : [...previous, name]);

  return (
    <div className="sector-management">
      <PageMeta title="Sector Management | Stack Works Flow" description="Manage sectors under different group types." />
      <header className="sec-heading">
        <div className="sec-heading-title">
          <span className="sec-heading-icon"><TbDatabase aria-hidden="true" /></span>
          <div><h1>Sector Management</h1><p>Manage sectors under different group types</p></div>
        </div>
        <nav className="sec-breadcrumb" aria-label="Breadcrumb"><TbHome aria-hidden="true" /><Link to="/">Home</Link><TbChevronRight aria-hidden="true" /><span aria-current="page">Sector</span></nav>
      </header>

      <section className="sec-card sec-form-card" ref={formCard} aria-labelledby="sec-form-heading">
        <div className="sec-form-heading sec-card-title">
          <span className="sec-section-icon"><TbCirclePlus aria-hidden="true" /></span>
          <div><h2 id="sec-form-heading">{editingId ? "Edit Sector" : "Add New Sector"}</h2><p>{editingId ? "Update the sector and its group type" : "Create a new sector under a group type"}</p></div>
        </div>
        <form id="sec-sector-form" onSubmit={handleSubmit}>
          {message.text && <div className={`sec-message sec-message-${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.text}</div>}
          <div className="sec-form-grid">
            <div className="sec-field">
              <label htmlFor="sec-group-type">Group Type <span>*</span></label>
              <select id="sec-group-type" name="groupType" value={formData.groupType} onChange={(event) => setFormData((previous) => ({ ...previous, groupType: event.target.value }))} required disabled={busy}>
                <option value="">Select Group Type</option>{groups.map(({ name }) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="sec-field">
              <label htmlFor="sec-sector-title">Sector Title <span>*</span></label>
              <input ref={titleInput} id="sec-sector-title" name="sectorTitle" type="text" value={formData.sectorTitle} placeholder="e.g., DBX-JDH" required disabled={busy}
                onChange={(event) => {
                  const input = event.target.value.replace(/-/g, "").toUpperCase();
                  const formatted = input.match(/.{1,3}/g)?.join("-") || "";
                  setFormData((previous) => ({ ...previous, sectorTitle: formatted }));
                }} />
            </div>
            <div className="sec-field">
              <label htmlFor="sec-full-sector">Full Sector <span>*</span></label>
              <input id="sec-full-sector" name="fullSector" type="text" value={formData.fullSector} placeholder="e.g., Lahore-Dubai" onChange={(event) => setFormData((previous) => ({ ...previous, fullSector: event.target.value }))} required disabled={busy} />
            </div>
          </div>
          <div className="sec-form-actions">
            <button type="submit" className="sec-button sec-button-primary" disabled={busy}><TbPlus aria-hidden="true" />{loading ? "Saving..." : editingId ? "Update Sector" : "Add Sector"}</button>
            {editingId && <button type="button" className="sec-button sec-button-secondary" disabled={busy} onClick={() => { resetForm(); setMessage({ type: "", text: "" }); }}><TbX aria-hidden="true" />Cancel</button>}
          </div>
        </form>
      </section>

      <section className="sec-card sec-list-card" aria-labelledby="sec-list-heading" aria-busy={fetchLoading}>
        <div className="sec-card-title sec-list-title">
          <span className="sec-section-icon"><TbLayoutGrid aria-hidden="true" /></span>
          <div><h2 id="sec-list-heading">All Sectors</h2><p>View and manage sectors grouped by region</p></div>
        </div>
        {fetchLoading ? <div className="sec-list-state" role="status">Loading sectors...</div> : fetchError ? (
          <div className="sec-list-state" role="alert"><strong>Unable to load sectors</strong><p>{fetchError}</p><button type="button" className="sec-button sec-button-primary" onClick={fetchSectors}>Retry</button></div>
        ) : (
          <div className="sec-groups-grid">
            {groups.map(({ name, flag }, groupIndex) => {
              const groupSectors = sectors.filter((sector) => sector.groupType === name);
              const collapsed = collapsedGroups.includes(name);
              const panelId = `sec-group-panel-${groupIndex}`;
              return (
                <article className={`sec-group${flag ? "" : " sec-group-umrah"}`} key={name}>
                  <h3><button type="button" className="sec-group-heading" aria-expanded={!collapsed} aria-controls={panelId} onClick={() => toggleGroup(name)}>
                    {flag ? <img className="sec-group-flag" src={`${import.meta.env.BASE_URL}images/sector-flags/${flag}.svg`} alt="" /> : <span className="sec-umrah-icon"><TbCube aria-hidden="true" /></span>}
                    <span className="sec-group-name">{name}</span><span className="sec-group-count" aria-label={`${groupSectors.length} sectors`}>{groupSectors.length}</span><TbChevronRight className={`sec-group-chevron${collapsed ? "" : " is-expanded"}`} aria-hidden="true" />
                  </button></h3>
                  <div id={panelId} hidden={collapsed}>
                    {groupSectors.length ? (
                      <div className="sec-table-scroll" role="region" aria-label={`${name} sectors`} tabIndex={0}>
                        <table className="sec-table">
                          <thead><tr><th scope="col">Id</th><th scope="col">Sector</th><th scope="col">Full Name</th><th scope="col">Action</th></tr></thead>
                          <tbody>{groupSectors.map((sector, index) => (
                            <tr key={sector._id}>
                              <td>{index + 1}</td><td>{sector.sectorTitle}</td><td>{sector.fullSector}</td>
                              <td><div className="sec-row-actions">
                                <button type="button" className="sec-row-button sec-edit" disabled={busy} onClick={() => handleEdit(sector)} aria-label={`Edit ${sector.sectorTitle}`}><TbPencil aria-hidden="true" />Edit</button>
                                <button type="button" className="sec-row-button sec-delete" disabled={busy} onClick={() => handleDelete(sector._id)} aria-label={`Delete ${sector.sectorTitle}`}><TbTrash aria-hidden="true" />{deletingId === sector._id ? "Deleting..." : "Delete"}</button>
                              </div></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    ) : <div className="sec-empty"><TbFolder aria-hidden="true" /><p>No sectors found for this group</p><span>Add a new sector to get started.</span></div>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Sector;
