import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router";
import { toast } from "react-toastify";
import { TbArrowsSort, TbCalendar, TbChevronDown, TbChevronRight, TbDotsVertical, TbEye, TbFileDescription, TbHome, TbInbox, TbLayoutGrid, TbList, TbPhoto, TbPencil, TbPlus, TbSearch, TbStack2, TbTrash, TbUpload, TbX } from "react-icons/tb";
import axiosInstance from "../../Api/axios";
import PageMeta from "../../components/common/PageMeta";
import "./special-offers.css";

interface Offer { _id: string; title: string; image?: string; createdAt: string; }
const errorMessage = (error: unknown, fallback: string) => isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : fallback;
const dateLabel = (date: string) => {
    const value = new Date(date);
    return Number.isNaN(value.getTime()) ? "Date unavailable" : value.toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" });
};
const monthLabel = (date: string) => {
    const value = new Date(date);
    return Number.isNaN(value.getTime()) ? "" : new Intl.DateTimeFormat("en-GB", { month: "2-digit", year: "numeric", timeZone: "Asia/Karachi" }).format(value);
};
const titleLines = (title: string) => {
    const [heading, ...description] = title.split(/\r?\n/);
    return { heading, description: description.join("\n").trim() };
};
function OfferImage({ offer }: { offer: Offer }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [offer.image]);
    return offer.image && !failed ? <img src={offer.image} alt={titleLines(offer.title).heading} onError={() => setFailed(true)} />
        : <div className="ic-image-empty"><TbPhoto aria-hidden="true" /><span>{failed ? "Image unavailable" : "Text-only card"}</span></div>;
}
function CardBadge({ offer }: { offer: Offer }) {
    return <span className={`ic-badge ${offer.image ? "ic-badge-image" : "ic-badge-text"}`}>
        {offer.image ? <TbPhoto aria-hidden="true" /> : <TbFileDescription aria-hidden="true" />}
        {offer.image ? "Image" : "Text Only"}
    </span>;
}
function MoreActions({ title, busy, onView, onEdit, onDelete }: {
    title: string; busy: boolean; onView: () => void; onEdit: () => void; onDelete: () => void;
}) {
    const menuRef = useRef<HTMLDetailsElement>(null);
    useEffect(() => {
        const closeOutside = (event: PointerEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) menuRef.current.open = false;
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && menuRef.current?.open) {
                menuRef.current.open = false;
                menuRef.current.querySelector("summary")?.focus();
            }
        };
        document.addEventListener("pointerdown", closeOutside);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeOutside);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, []);
    const choose = (action: () => void) => {
        if (menuRef.current) menuRef.current.open = false;
        action();
    };
    return <details className="ic-more" ref={menuRef}>
        <summary aria-label={`More actions for ${title}`}><TbDotsVertical aria-hidden="true" /></summary>
        <div className="ic-more-menu" aria-label={`Actions for ${title}`}>
            <button onClick={() => choose(onView)}><TbEye aria-hidden="true" />View offer</button>
            <button onClick={() => choose(onEdit)} disabled={busy}><TbPencil aria-hidden="true" />Edit offer</button>
            <button className="ic-more-delete" onClick={() => choose(onDelete)} disabled={busy}><TbTrash aria-hidden="true" />Delete offer</button>
        </div>
    </details>;
}
export default function SpecialOffers() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [currentOffer, setCurrentOffer] = useState<Offer | null>(null);
    const [title, setTitle] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [sort, setSort] = useState("latest");
    const [view, setView] = useState<"grid" | "list">("grid");
    const [viewOffer, setViewOffer] = useState<Offer | null>(null);
    const titleRef = useRef<HTMLTextAreaElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const busy = submitting || deletingId !== null;

    const fetchOffers = useCallback(async () => {
        setLoading(true); setLoadError("");
        try {
            const response = await axiosInstance.get("/specialOffer/getSpecialOffers");
            if (!response.data.success) throw new Error("Failed to load offers");
            setOffers(response.data.data);
        } catch (error) { setLoadError(errorMessage(error, "Unable to load index cards. Please try again.")); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { void fetchOffers(); }, [fetchOffers]);
    useEffect(() => {
        if (!image) { setImagePreview(currentOffer?.image || ""); return; }
        const url = URL.createObjectURL(image); setImagePreview(url);
        return () => URL.revokeObjectURL(url);
    }, [image, currentOffer]);
    useEffect(() => { if (showForm) titleRef.current?.focus(); }, [showForm, currentOffer]);
    useEffect(() => {
        const dialog = dialogRef.current;
        if (viewOffer && dialog && !dialog.open) dialog.showModal();
        else if (!viewOffer && dialog?.open) dialog.close();
    }, [viewOffer]);
    const openForm = (offer: Offer | null = null) => {
        setCurrentOffer(offer); setTitle(offer?.title || ""); setImage(null);
        if (fileRef.current) fileRef.current.value = "";
        setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" });
    };
    const closeForm = () => { setShowForm(false); setCurrentOffer(null); setTitle(""); setImage(null); };
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); if (!title.trim() || busy) return; setSubmitting(true);
        try {
            const data = new FormData(); data.append("title", title);
            if (image) data.append("image", image);
            if (currentOffer) data.append("id", currentOffer._id);
            const response = currentOffer
                ? await axiosInstance.put("/specialOffer/updateSpecialOffer", data, { headers: { "Content-Type": "multipart/form-data" } })
                : await axiosInstance.post("/specialOffer/createSpecialOffer", data, { headers: { "Content-Type": "multipart/form-data" } });
            if (!response.data.success) { toast.error(response.data.message || "Unable to save offer"); return; }
            const saved: Offer = response.data.data;
            setOffers(previous => currentOffer ? previous.map(offer => offer._id === saved._id ? saved : offer) : [saved, ...previous]);
            toast.success(currentOffer ? "Offer updated successfully" : "Offer created successfully"); closeForm();
        } catch (error) { toast.error(errorMessage(error, "Unable to save offer. Please try again.")); }
        finally { setSubmitting(false); }
    };
    const handleDelete = async (offer: Offer) => {
        if (busy || !window.confirm("Are you sure you want to delete this offer?")) return;
        setDeletingId(offer._id);
        try {
            const response = await axiosInstance.delete("/specialOffer/deleteSpecialOffer", { data: { id: offer._id } });
            if (!response.data.success) { toast.error(response.data.message || "Unable to delete offer"); return; }
            setOffers(previous => previous.filter(item => item._id !== offer._id));
            if (currentOffer?._id === offer._id) closeForm();
            toast.success("Offer deleted successfully");
        } catch (error) { toast.error(errorMessage(error, "Unable to delete offer. Please try again.")); }
        finally { setDeletingId(null); }
    };
    const withImages = offers.filter(offer => offer.image).length;
    const currentMonth = monthLabel(new Date().toISOString());
    const stats = [
        { label: "Total Cards", value: offers.length, description: "All promotional content", icon: TbStack2, color: "blue" },
        { label: "With Images", value: withImages, description: "Image-based promotions", icon: TbPhoto, color: "green" },
        { label: "Text Only", value: offers.length - withImages, description: "Cards without an image", icon: TbFileDescription, color: "amber" },
        { label: "Added This Month", value: offers.filter(offer => monthLabel(offer.createdAt) === currentMonth).length, description: "Recently created content", icon: TbCalendar, color: "pink" },
    ];
    const visibleOffers = offers.filter(offer => offer.title.toLowerCase().includes(search.trim().toLowerCase()) && (filter === "all" || (filter === "images" ? !!offer.image : !offer.image)))
        .sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : ((Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0)) * (sort === "latest" ? -1 : 1));
    return <div className="index-cards">
        <PageMeta title="Index Cards | Travel Portal" description="Manage your promotional index cards and offers." />
        <nav className="ic-breadcrumb" aria-label="Breadcrumb"><Link to="/" aria-label="Dashboard home"><TbHome /></Link><span className="ic-breadcrumb-divider" /><Link to="/">Dashboard</Link><TbChevronRight aria-hidden="true" /><span aria-current="page">Index Cards</span></nav>
        <header className="ic-heading"><div><h1>Index Cards</h1><p>Manage your promotional content</p></div><button className="ic-primary" onClick={() => openForm()} disabled={busy}><TbPlus aria-hidden="true" />Add New Offer</button></header>
        <div className="ic-stats" aria-label="Index card summaries">{stats.map(({ label, value, description, icon: Icon, color }) => <div className={`ic-stat ic-stat-${color}`} key={label}><span className="ic-stat-icon"><Icon aria-hidden="true" /></span><div><strong>{loading || loadError ? "—" : value}</strong><h2>{label}</h2><p>{description}</p></div></div>)}</div>
        {showForm && <section className="ic-form-panel" aria-labelledby="ic-form-heading">
            <div className="ic-form-heading"><h2 id="ic-form-heading">{currentOffer ? "Edit Offer Details" : "Create New Offer"}</h2><button className="ic-button" onClick={closeForm} disabled={busy}><TbX aria-hidden="true" />Cancel</button></div>
            <form id="ic-form" onSubmit={handleSubmit}><fieldset disabled={busy} className="ic-form-grid"><div className="ic-form-fields">
                <label htmlFor="ic-title">Offer Title <span>*</span></label><textarea id="ic-title" name="title" ref={titleRef} rows={4} required value={title} onChange={event => setTitle(event.target.value)} placeholder={"e.g. Umrah Special Offer 2026\nMore details here..."} />
                <label htmlFor="ic-image">Offer Image <span className="ic-optional">(optional)</span></label><div className="ic-upload"><TbUpload aria-hidden="true" /><input id="ic-image" name="image" ref={fileRef} type="file" accept="image/*" onChange={event => {
                    const file = event.target.files?.[0] || null;
                    if (file && !file.type.startsWith("image/")) { toast.error("Please choose an image file."); event.target.value = ""; return; }
                    setImage(file);
                }} /></div>
                <div className="ic-form-actions"><button type="submit" className="ic-primary" disabled={busy || !title.trim()}>{submitting ? "Saving..." : currentOffer ? "Save Changes" : "Create Offer"}</button><button type="button" className="ic-button" onClick={closeForm}>Dismiss</button></div>
            </div><div className="ic-image-preview">{imagePreview ? <img src={imagePreview} alt="Offer preview" /> : <><TbPhoto aria-hidden="true" /><p>Image preview will appear here</p></>}</div></fieldset></form>
        </section>}
        <div className="ic-toolbar">
            <div className="ic-search"><TbSearch aria-hidden="true" /><input id="ic-search" type="search" aria-label="Search index cards" placeholder="Search index cards by title or description..." value={search} onChange={event => setSearch(event.target.value)} /></div>
            <div className="ic-select"><select id="ic-filter" aria-label="Filter card content" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All Content</option><option value="images">With Images</option><option value="text">Text Only</option></select><TbChevronDown aria-hidden="true" /></div>
            <div className="ic-select ic-sort"><TbArrowsSort aria-hidden="true" /><select id="ic-sort" aria-label="Sort index cards" value={sort} onChange={event => setSort(event.target.value)}><option value="latest">Sort by Latest</option><option value="oldest">Sort by Oldest</option><option value="title">Sort by Title</option></select><TbChevronDown aria-hidden="true" /></div>
            <div className="ic-view-toggle" role="group" aria-label="Card layout"><button aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}><TbLayoutGrid /></button><button aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><TbList /></button></div>
        </div>
        {loading ? <div className="ic-state" role="status"><span className="ic-spinner" />Loading index cards...</div>
            : loadError ? <div className="ic-state" role="alert"><TbInbox /><h2>Unable to load index cards</h2><p>{loadError}</p><button className="ic-button" onClick={() => void fetchOffers()}>Retry</button></div>
            : visibleOffers.length === 0 ? <div className="ic-state"><TbInbox /><h2>{offers.length ? "No matching cards" : "No index cards yet"}</h2><p>{offers.length ? "Try another search or content filter." : "Create your first offer to start sharing promotional content."}</p><button className="ic-button" disabled={busy} onClick={() => { if (offers.length) { setSearch(""); setFilter("all"); } else openForm(); }}>{offers.length ? "Clear filters" : "Add New Offer"}</button></div>
            : <div className={`ic-cards ic-cards-${view}`} aria-label="Promotional cards">{visibleOffers.map(offer => {
                const { heading, description } = titleLines(offer.title);
                return <article className="ic-card" key={offer._id}>
                    <div className="ic-card-image"><OfferImage offer={offer} />{view === "grid" && <CardBadge offer={offer} />}</div>
                    <div className="ic-card-content">{view === "list" && <CardBadge offer={offer} />}<h2>{heading}</h2>{description && <p className="ic-card-description">{description}</p>}<time className="ic-date" dateTime={offer.createdAt}><TbCalendar aria-hidden="true" />{dateLabel(offer.createdAt)}</time></div>
                    <div className="ic-card-actions">
                        {view === "list" ? <MoreActions title={heading} busy={busy} onView={() => setViewOffer(offer)} onEdit={() => openForm(offer)} onDelete={() => void handleDelete(offer)} /> : <>
                            <button className="ic-button ic-view" aria-label={`View ${heading}`} onClick={() => setViewOffer(offer)}><TbEye aria-hidden="true" />View</button>
                            <button className="ic-button ic-edit" aria-label={`Edit ${heading}`} onClick={() => openForm(offer)} disabled={busy}><TbPencil aria-hidden="true" />Edit</button>
                            <button className="ic-button ic-delete" aria-label={`Delete ${heading}`} onClick={() => void handleDelete(offer)} disabled={busy}><TbTrash aria-hidden="true" />{deletingId === offer._id ? "Deleting..." : "Delete"}</button>
                        </>}
                    </div>
                </article>;
            })}</div>}
        {!loading && !loadError && offers.length > 0 && <p className="ic-results" role="status">Showing {visibleOffers.length} of {offers.length} cards</p>}
        <dialog ref={dialogRef} className="ic-dialog" aria-labelledby="ic-view-title" onCancel={() => setViewOffer(null)} onClose={() => setViewOffer(null)} onClick={event => { if (event.target === event.currentTarget) setViewOffer(null); }}>
            {viewOffer && <div className="ic-dialog-content"><div className="ic-dialog-heading"><h2 id="ic-view-title">Offer Preview</h2><button className="ic-button" aria-label="Close offer preview" onClick={() => setViewOffer(null)}><TbX /></button></div>{viewOffer.image && <div className="ic-dialog-image"><OfferImage offer={viewOffer} /></div>}<h3>{titleLines(viewOffer.title).heading}</h3>{titleLines(viewOffer.title).description && <p>{titleLines(viewOffer.title).description}</p>}<time className="ic-date" dateTime={viewOffer.createdAt}><TbCalendar aria-hidden="true" />{dateLabel(viewOffer.createdAt)}</time></div>}
        </dialog>
    </div>;
}
