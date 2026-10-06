import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "react-toastify";
import {
  TbBolt, TbBriefcase, TbChevronLeft, TbChevronRight, TbInbox, TbMail,
  TbPencil, TbPhone, TbPlus, TbSearch, TbShieldCheck, TbSquarePlus,
  TbTrash, TbUsers, TbX,
} from "react-icons/tb";
import PageMeta from "../components/common/PageMeta";
import TeamContactForm from "./TeamContactForm";
import { addTeamContact, getTeamContacts, updateTeamContact, deleteTeamContact } from "../Api/teamContactApi";
import "./team-contacts.css";

const mapContact = (contact) => ({
  id: contact._id, name: contact.name, designation: contact.role,
  gmail: contact.email, number: contact.phone,
});

const TeamContactAdminPage = () => {
  const [contacts, setContacts] = useState([]);
  const [editingContact, setEditingContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [page, setPage] = useState(1);
  const formCard = useRef(null);

  const fetchContacts = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getTeamContacts();
      setContacts(data.map(mapContact));
    } catch {
      setLoadError(true);
      toast.error("Failed to load team contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, []);

  const handleSubmit = async (contact) => {
    if (submitting) return false;
    if (!Object.values(contact).every((value) => value.trim())) {
      toast.error("Please fill in all four contact fields");
      return false;
    }
    const payload = { name: contact.name, email: contact.gmail, phone: contact.number, role: contact.designation };
    setSubmitting(true);
    try {
      if (editingContact) {
        const result = await updateTeamContact(editingContact.id, payload);
        setContacts((previous) => previous.map((item) => item.id === editingContact.id ? mapContact(result.data) : item));
        setEditingContact(null);
        toast.success("Contact updated successfully");
      } else {
        const saved = await addTeamContact(payload);
        setContacts((previous) => [...previous, mapContact(saved)]);
        toast.success("Contact added successfully");
      }
      return true;
    } catch (error) {
      toast.error("Operation failed: " + (error?.response?.data?.message || error.message));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this contact?")) return;
    setDeletingId(id);
    try {
      await deleteTeamContact(id);
      setContacts((previous) => previous.filter((contact) => contact.id !== id));
      if (editingContact?.id === id) setEditingContact(null);
      toast.success("Contact deleted successfully");
    } catch (error) {
      toast.error("Delete failed: " + (error?.response?.data?.message || error.message));
    } finally {
      setDeletingId(null);
    }
  };

  const focusForm = () => {
    requestAnimationFrame(() => {
      formCard.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
      document.getElementById("tc-name")?.focus({ preventScroll: true });
    });
  };
  const handleEdit = (contact) => { setEditingContact(contact); focusForm(); };
  const designations = [...new Set(contacts.map((contact) => contact.designation).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const filteredContacts = contacts.filter((contact) =>
    (!designationFilter || contact.designation === designationFilter) &&
    [contact.name, contact.designation, contact.gmail, contact.number].join(" ").toLowerCase().includes(search.trim().toLowerCase())
  );
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredContacts.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * pageSize;
  const visibleContacts = filteredContacts.slice(firstIndex, firstIndex + pageSize);

  return (
    <div className="team-contacts-management">
      <PageMeta title="Team Contact Management | Stack Works Flow" description="Add, organize and manage internal team contacts." />
      <header className="tc-banner">
        <div className="tc-banner-title"><span className="tc-banner-icon"><TbUsers aria-hidden="true" /></span><div><h1>Team Contact Management</h1><p>Add, organize and manage internal team contacts.</p></div></div>
        <nav className="tc-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><TbChevronRight aria-hidden="true" /><span>Team</span><TbChevronRight aria-hidden="true" /><span aria-current="page">Team Contacts</span></nav>
      </header>

      <div className="tc-stats" aria-label="Team contact summary">
        {[
          { label: "Total Contacts", value: contacts.length, note: "All team contacts", icon: TbUsers, tone: "blue" },
          { label: "Designations", value: designations.length, note: "Roles represented on your team", icon: TbBriefcase, tone: "violet" },
          { label: "Contacts with Numbers", value: contacts.filter((contact) => contact.number?.trim()).length, note: "Team members with a phone number", icon: TbPhone, tone: "green" },
        ].map(({ label, value, note, icon: Icon, tone }) => <div className="tc-stat" key={label}><span className={`tc-stat-icon tc-tone-${tone}`}><Icon aria-hidden="true" /></span><div><span>{label}</span><strong>{loading || loadError ? "—" : value}</strong><p>{note}</p></div></div>)}
      </div>

      <div className="tc-main-grid">
        <section className="tc-card tc-form-card" ref={formCard} aria-labelledby="tc-form-heading">
          <div className="tc-card-title"><span className="tc-section-icon"><TbSquarePlus aria-hidden="true" /></span><div><h2 id="tc-form-heading">{editingContact ? "Edit Team Contact" : "Add Team Contact"}</h2><p>{editingContact ? "Update your team member’s contact information." : "Add a new team member to your organization."}</p></div></div>
          <TeamContactForm onSubmit={handleSubmit} initialValues={editingContact} isEditing={!!editingContact} onCancel={() => setEditingContact(null)} submitting={submitting || deletingId !== null} />
        </section>
        <aside className="tc-connect-card" aria-labelledby="tc-connect-heading">
          <div className="tc-connect-copy"><span className="tc-connect-tag">Build a Stronger Team</span><h2 id="tc-connect-heading">Keep your team<br /><span>connected</span></h2><p>Maintain an updated directory of your team members for better collaboration and smoother communication.</p>
            <ul>{[
              { title: "Organize your contacts", text: "Keep team details structured and easy to find", icon: TbUsers, tone: "green" },
              { title: "Quick access", text: "Find and connect with team members instantly", icon: TbBolt, tone: "blue" },
              { title: "Always up to date", text: "Keep your team information current", icon: TbShieldCheck, tone: "violet" },
            ].map(({ title, text, icon: Icon, tone }) => <li key={title}><span className={`tc-benefit-icon tc-tone-${tone}`}><Icon aria-hidden="true" /></span><div><strong>{title}</strong><p>{text}</p></div></li>)}</ul>
          </div>
          <img src={`${import.meta.env.BASE_URL}images/team/contact-cards.png`} alt="" aria-hidden="true" className="tc-connect-art" />
        </aside>
      </div>

      <section className="tc-card tc-list-card" aria-labelledby="tc-list-heading" aria-busy={loading}>
        <div className="tc-list-heading"><div className="tc-card-title"><span className="tc-section-icon"><TbUsers aria-hidden="true" /></span><div><h2 id="tc-list-heading">Team Contacts</h2><p>View and manage all team contacts.</p></div></div>
          <div className="tc-toolbar"><label className="tc-search"><TbSearch aria-hidden="true" /><input type="search" placeholder="Search team contacts..." aria-label="Search team contacts" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label><select value={designationFilter} onChange={(event) => { setDesignationFilter(event.target.value); setPage(1); }} aria-label="Filter by designation"><option value="">All Designations</option>{designations.map((designation) => <option value={designation} key={designation}>{designation}</option>)}</select>{(search || designationFilter) && <button type="button" className="tc-clear" aria-label="Clear contact filters" onClick={() => { setSearch(""); setDesignationFilter(""); setPage(1); }}><TbX aria-hidden="true" /></button>}</div>
        </div>
        <div className="tc-table-scroll" role="region" aria-label="Team contacts table" tabIndex={0}>
          <table className="tc-table"><thead><tr><th scope="col">#</th><th scope="col">Name</th><th scope="col">Designation</th><th scope="col">Email</th><th scope="col">Phone</th><th scope="col">Actions</th></tr></thead><tbody>
            {loading ? <tr><td colSpan={6} className="tc-empty" role="status">Loading team contacts...</td></tr> : loadError ? <tr><td colSpan={6} className="tc-empty"><strong>Unable to load team contacts</strong><span>Please try again.</span><button type="button" className="tc-button tc-button-primary" onClick={fetchContacts}>Retry</button></td></tr> : !visibleContacts.length ? <tr><td colSpan={6} className="tc-empty"><TbInbox aria-hidden="true" /><strong>{contacts.length ? "No matching contacts found" : "No team contacts found"}</strong><span>{contacts.length ? "Try a different name, designation, email or number." : "Add your first team contact to get started."}</span>{!contacts.length && <button type="button" className="tc-button tc-button-primary" onClick={focusForm}><TbPlus aria-hidden="true" />Add Team Contact</button>}</td></tr> : visibleContacts.map((contact, index) => <tr key={contact.id}><td>{firstIndex + index + 1}</td><td><div className="tc-contact-name"><span className="tc-contact-avatar" aria-hidden="true">{contact.name?.[0]?.toUpperCase()}</span><strong>{contact.name}</strong></div></td><td><span className="tc-designation">{contact.designation || "—"}</span></td><td><a className="tc-contact-link" href={`mailto:${contact.gmail}`}><TbMail aria-hidden="true" />{contact.gmail}</a></td><td><a className="tc-contact-link" href={`tel:${contact.number}`}><TbPhone aria-hidden="true" />{contact.number}</a></td><td><div className="tc-row-actions"><button type="button" className="tc-action" aria-label={`Edit ${contact.name}`} title="Edit contact" disabled={submitting || deletingId !== null} onClick={() => handleEdit(contact)}><TbPencil aria-hidden="true" /></button><button type="button" className="tc-action tc-action-danger" aria-label={`Delete ${contact.name}`} title="Delete contact" disabled={submitting || deletingId !== null} onClick={() => handleDelete(contact.id)}><TbTrash aria-hidden="true" /></button></div></td></tr>)}
          </tbody></table>
        </div>
        {!loading && !loadError && filteredContacts.length > 0 && <div className="tc-pagination"><p aria-live="polite">Showing {firstIndex + 1} to {Math.min(firstIndex + pageSize, filteredContacts.length)} of {filteredContacts.length} contacts</p><div><button type="button" className="tc-page-button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><TbChevronLeft aria-hidden="true" /></button>{Array.from({ length: Math.min(5, pageCount) }, (_, index) => Math.min(Math.max(currentPage - 2, 1), Math.max(pageCount - 4, 1)) + index).map((number) => <button type="button" className={`tc-page-button${currentPage === number ? " is-current" : ""}`} key={number} aria-label={`Page ${number}`} aria-current={currentPage === number ? "page" : undefined} onClick={() => setPage(number)}>{number}</button>)}<button type="button" className="tc-page-button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><TbChevronRight aria-hidden="true" /></button></div></div>}
      </section>
    </div>
  );
};

export default TeamContactAdminPage;
