import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
import { TbArrowRight, TbArrowsSort, TbCalendarEvent, TbChevronDown, TbChevronLeft, TbChevronRight, TbCopy, TbDotsVertical, TbStack2, TbPencil, TbPlane, TbPlus, TbSearch, TbTrash, TbUsers, TbUsersGroup } from "react-icons/tb";
import { PiSeat, PiUsersThreeFill } from "react-icons/pi";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import "./group-ticketing.css";

const GROUP_TYPE_OPTIONS = ["UAE Groups", "KSA Groups", "Bahrain Groups", "Mascat Groups", "Qatar Groups", "UK Groups", "Umrah Groups"];
interface Flight { sectorFrom: string; sectorTo: string; fromTerminal?: string; toTerminal?: string; depDate: string; depTime: string; airline: string; flightNo: string }
interface GroupBooking {
  _id: string; voucher_id: string; groupBookingId: string; user: string; groupName?: string; sector?: string;
  airline?: string; pnr?: string; groupType: string; flights: Flight[]; totalSeats: number; createdAt: string;
  price: { sellingCurrencyB2B?: string; sellingAdultPriceB2B?: number };
  priceOnCall?: { seats?: boolean; adult?: boolean };
}
interface Airline { _id: string; airlineName: string; logo?: string }
interface City { airportCode: string; cityEn: string }
type SortKey = "group" | "route" | "airline" | "seats" | "price";
const errorMessage = (error: unknown, fallback: string) => isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : fallback;
function dateLabel(value: string | undefined, short = false) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  const label = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: short ? "short" : "2-digit", year: "numeric", timeZone: "Asia/Karachi" }).format(date);
  return short ? label : label.replace(/\//g, "-");
}
function AirlineLogo({ airline, logo }: { airline: string; logo?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [logo]);
  return <span className={`gt-airline-logo${logo && !failed ? "" : " gt-airline-logo-empty"}`}>
    {logo && !failed ? <img src={logo} alt={`${airline} logo`} onError={() => setFailed(true)} /> : <TbPlane aria-hidden="true" />}
  </span>;
}
function MoreActions({ booking, busy, onEdit, onDelete }: { booking: GroupBooking; busy: boolean; onEdit: () => void; onDelete: () => void }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!position) return;
    menuRef.current?.querySelector("button")?.focus({ preventScroll: true });
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) setPosition(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { setPosition(null); buttonRef.current?.focus(); } };
    const closeOnMove = () => setPosition(null);
    document.addEventListener("pointerdown", closeOutside); document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnMove); window.addEventListener("scroll", closeOnMove, true);
    return () => {
      document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnMove); window.removeEventListener("scroll", closeOnMove, true);
    };
  }, [position]);
  const choose = (action: () => void) => { setPosition(null); buttonRef.current?.focus(); action(); };
  const copyVoucher = async () => {
    try { await navigator.clipboard.writeText(booking.voucher_id); toast.success("Voucher ID copied"); }
    catch { toast.error("Could not copy voucher ID. Please try again."); }
  };
  return <>
    <button ref={buttonRef} type="button" className="gt-more-button" aria-label={`More actions for ${booking.groupName || "group"}`} aria-expanded={Boolean(position)} aria-controls={`gt-menu-${booking._id}`} disabled={busy} onClick={() => {
      if (position) { setPosition(null); return; }
      const box = buttonRef.current!.getBoundingClientRect();
      setPosition({ top: box.bottom + 145 > innerHeight ? Math.max(8, box.top - 138) : box.bottom + 6, left: Math.max(8, Math.min(box.right - 200, innerWidth - 208)) });
    }}><TbDotsVertical aria-hidden="true" /></button>
    {position && createPortal(<div id={`gt-menu-${booking._id}`} className="gt-more-menu" ref={menuRef} style={position} aria-label={`Actions for ${booking.groupName || "group"}`}>
      <button onClick={() => choose(() => { void copyVoucher(); })}><TbCopy aria-hidden="true" />Copy voucher ID</button>
      <button onClick={() => choose(onEdit)}><TbPencil aria-hidden="true" />Edit group</button>
      <button className="gt-menu-delete" onClick={() => choose(onDelete)}><TbTrash aria-hidden="true" />Delete group</button>
    </div>, document.body)}
  </>;
}

export default function GroupTicketing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState<GroupBooking[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [cities, setCities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupTypeFilter, setGroupTypeFilter] = useState(new URLSearchParams(location.search).get("groupType") || "All");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; direction: "ascending" | "descending" } | null>(null);
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 700px)").matches);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const response = await axiosInstance.get("/group-ticketing");
      if (!response.data.success) throw new Error("Failed to load groups");
      setBookings(response.data.data);
    } catch (error) { setLoadError(errorMessage(error, "Unable to load groups. Please try again.")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void fetchBookings(); }, [fetchBookings]);
  useEffect(() => {
    let cancelled = false;
    void axiosInstance.get("/airline").then((response) => { if (!cancelled && response.data.success) setAirlines(response.data.data); }).catch(() => { /* Airline logos are optional. */ });
    void fetch(`${import.meta.env.BASE_URL}data/cities.json`).then((response) => {
      if (!response.ok) throw new Error("Airport list unavailable");
      return response.json() as Promise<City[]>;
    }).then((data) => { if (!cancelled) setCities(Object.fromEntries(data.map((city) => [city.airportCode, city.cityEn]))); }).catch(() => { /* Route codes remain visible when names are unavailable. */ });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { setGroupTypeFilter(new URLSearchParams(location.search).get("groupType") || "All"); setPage(1); }, [location.search]);

  const handleDelete = async (booking: GroupBooking) => {
    if (deletingId || !window.confirm(`Are you sure you want to delete ${booking.groupName || "this group"}?`)) return;
    setDeletingId(booking._id);
    try {
      const response = await axiosInstance.delete(`/group-ticketing/${booking._id}`);
      if (!response.data.success) throw new Error("Failed to delete group");
      setBookings((previous) => previous.filter((group) => group._id !== booking._id));
      toast.success("Group deleted successfully");
    } catch (error) { toast.error(errorMessage(error, "Failed to delete group. Please try again.")); }
    finally { setDeletingId(null); }
  };
  const query = searchTerm.trim().toLowerCase();
  const filteredBookings = bookings.filter((booking) => {
    const searchable = [booking.voucher_id, booking.groupBookingId, booking.user, booking.groupName, booking.airline, booking.sector, booking.pnr,
      ...(booking.flights || []).flatMap((flight) => [flight.sectorFrom, flight.sectorTo, flight.fromTerminal, flight.toTerminal, cities[flight.sectorFrom], cities[flight.sectorTo]])];
    return (groupTypeFilter === "All" || booking.groupType === groupTypeFilter) && searchable.some((value) => (value || "").toLowerCase().includes(query));
  });
  const sortValue = (booking: GroupBooking, key: SortKey) => {
    switch (key) {
      case "group": return booking.groupName || "Unnamed Group";
      case "route": return (booking.flights || []).map((flight) => `${flight.sectorFrom} ${flight.sectorTo}`).join(" ");
      case "airline": return booking.airline || "Multiple";
      case "seats": return booking.totalSeats || 0;
      case "price": return booking.price?.sellingAdultPriceB2B || 0;
    }
  };
  const sortedBookings = sort ? [...filteredBookings].sort((a, b) => {
    const first = sortValue(a, sort.key), second = sortValue(b, sort.key);
    const result = typeof first === "number" && typeof second === "number" ? first - second : String(first).localeCompare(String(second), undefined, { numeric: true });
    return sort.direction === "ascending" ? result : -result;
  }) : filteredBookings;
  const totalPages = Math.max(1, Math.ceil(sortedBookings.length / entriesPerPage));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * entriesPerPage;
  const visibleBookings = sortedBookings.slice(start, start + entriesPerPage);
  const pageNumbers = Array.from(new Set([1, ...Array.from({ length: 3 }, (_, index) => currentPage - 1 + index).filter((value) => value > 0 && value <= totalPages), totalPages])).sort((a, b) => a - b);
  const groupTypeOptions = Array.from(new Set([...GROUP_TYPE_OPTIONS, groupTypeFilter !== "All" ? groupTypeFilter : ""].filter(Boolean)));
  const sortHeader = (title: string, key: SortKey) => <th scope="col" aria-sort={sort?.key === key ? sort.direction : "none"}>
    <button type="button" tabIndex={mobile ? -1 : 0} onClick={() => setSort((previous) => ({ key, direction: previous?.key === key && previous.direction === "ascending" ? "descending" : "ascending" }))}>
      {title}<TbArrowsSort className={sort?.key === key ? "is-active" : ""} aria-hidden="true" />
    </button>
  </th>;
  const cityName = (code: string, terminal?: string) => cities[code] || (terminal && terminal !== code ? terminal.replace(/\s*\([A-Z]{3}\)\s*$/, "") : "");

  return <div className="group-ticketing-page">
    <PageMeta title="Group Ticketing" description="Manage your group bookings, routes, seats and pricing" />
    <div className="gt-page-heading"><div><h1>Group Ticketing</h1><p>Manage your group bookings, routes, seats and pricing.</p></div><nav aria-label="Breadcrumb"><Link to="/">Home</Link><TbChevronRight aria-hidden="true" /><span aria-current="page">Group Ticketing</span></nav></div>
    <section className="gt-panel" aria-labelledby="gt-list-heading">
      <div className="gt-banner"><span className="gt-banner-icon"><PiUsersThreeFill aria-hidden="true" /></span><div><h2 id="gt-list-heading">Group Groups</h2><p>View and manage all your group ticketing configurations.</p></div><Link to="/group-ticketing/create" className="gt-create"><TbPlus aria-hidden="true" />Create New Group</Link></div>
      <div className="gt-content">
        <div className="gt-filters">
          <div><label htmlFor="gt-type">Filter by Group Type</label><div className="gt-filter-control"><TbStack2 aria-hidden="true" /><select id="gt-type" value={groupTypeFilter} onChange={(event) => { setGroupTypeFilter(event.target.value); setPage(1); }}><option value="All">All Types</option>{groupTypeOptions.map((type) => <option key={type}>{type}</option>)}</select><TbChevronDown className="gt-chevron" aria-hidden="true" /></div></div>
          <div><label htmlFor="gt-search">Search</label><div className="gt-filter-control"><TbSearch aria-hidden="true" /><input id="gt-search" type="search" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} placeholder="Search by voucher ID, group name, airline, sector..." /></div></div>
        </div>
        <div className="gt-table-toolbar"><label className="gt-entries" htmlFor="gt-entries">Show<span><select id="gt-entries" value={entriesPerPage} onChange={(event) => { setEntriesPerPage(Number(event.target.value)); setPage(1); }}>{[10, 25, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}</select><TbChevronDown aria-hidden="true" /></span>entries</label><span className="gt-total" aria-live="polite"><TbUsers aria-hidden="true" />Total Groups: {loading ? "..." : bookings.length}</span><label className="gt-mobile-sort" htmlFor="gt-mobile-sort">Sort by<select id="gt-mobile-sort" value={sort ? `${sort.key}:${sort.direction}` : "default"} onChange={(event) => {
          if (event.target.value === "default") { setSort(null); return; }
          const [key, direction] = event.target.value.split(":") as [SortKey, "ascending" | "descending"];
          setSort({ key, direction });
        }}><option value="default">Latest groups</option>{([{ key: "group", title: "Group name" }, { key: "route", title: "Route" }, { key: "airline", title: "Airline" }, { key: "seats", title: "Seats" }, { key: "price", title: "Price" }] as const).flatMap(({ key, title }) => [<option key={`${key}-asc`} value={`${key}:ascending`}>{title}: {key === "seats" || key === "price" ? "Low to high" : "A to Z"}</option>, <option key={`${key}-desc`} value={`${key}:descending`}>{title}: {key === "seats" || key === "price" ? "High to low" : "Z to A"}</option>])}</select></label></div>
        {loadError ? <div className="gt-empty gt-load-error" role="alert"><TbPlane aria-hidden="true" /><p>{loadError}</p><button type="button" onClick={() => { void fetchBookings(); }}>Try again</button></div> : loading ? <div className="gt-empty" role="status">Loading groups...</div> : <>
          <div className="gt-table-scroll" role="region" aria-label="Group bookings" tabIndex={0}>
            <table className="gt-table"><colgroup><col className="gt-col-number" /><col className="gt-col-group" /><col className="gt-col-route" /><col className="gt-col-airline" /><col className="gt-col-seats" /><col className="gt-col-price" /><col className="gt-col-actions" /></colgroup>
              <thead><tr><th scope="col">#</th>{sortHeader("Group & Voucher", "group")}{sortHeader("Sector (Routes)", "route")}{sortHeader("Airline & PNR", "airline")}{sortHeader("Available Seats", "seats")}{sortHeader("B2B Price (Adult)", "price")}<th scope="col">Actions</th></tr></thead>
              <tbody>{visibleBookings.map((booking, index) => {
                const airlineName = booking.airline || "Multiple";
                const logo = airlines.find((airline) => airline.airlineName.toLowerCase() === airlineName.toLowerCase())?.logo;
                const busy = deletingId !== null;
                return <tr key={booking._id}>
                  <td className="gt-row-number">{start + index + 1}</td>
                  <td className="gt-group-cell"><div className="gt-group-info"><span className="gt-group-icon"><PiUsersThreeFill aria-hidden="true" /></span><div><strong>{booking.groupName || "Unnamed Group"}</strong><p>{booking.voucher_id}<span className="gt-meta-divider"> | </span>{dateLabel(booking.createdAt)}</p><span className="gt-group-badge">{booking.groupType}</span></div></div></td>
                  <td data-label="Sector (Routes)"><div className="gt-routes">{booking.flights?.length ? booking.flights.map((flight, flightIndex) => <div className="gt-route" key={flightIndex}><div className="gt-route-codes"><strong>{flight.sectorFrom || "N/A"}</strong><TbArrowRight aria-hidden="true" /><strong>{flight.sectorTo || "N/A"}</strong></div><div className="gt-route-cities"><span>{cityName(flight.sectorFrom, flight.fromTerminal)}</span><span>{cityName(flight.sectorTo, flight.toTerminal)}</span></div><p className="gt-route-date" title={flight.depTime ? `Departure ${flight.depTime}` : undefined}><TbCalendarEvent aria-hidden="true" /><time dateTime={flight.depDate?.slice(0, 10)}>{dateLabel(flight.depDate, true)}</time>{flight.depTime && <span className="gt-departure-time">{flight.depTime}</span>}</p></div>) : <span className="gt-muted">No flights added</span>}</div></td>
                  <td data-label="Airline & PNR"><div className="gt-airline-info"><AirlineLogo airline={airlineName} logo={logo} /><div><strong>{airlineName}</strong>{booking.pnr ? <span className="gt-pnr">{booking.pnr}</span> : <span className="gt-muted gt-no-pnr">No PNR</span>}</div></div></td>
                  <td data-label="Available Seats"><div className={`gt-seats${booking.totalSeats > 5 && !booking.priceOnCall?.seats ? " gt-seats-blue" : ""}`}><PiSeat aria-hidden="true" /><div>{booking.priceOnCall?.seats ? <strong className="gt-on-call">On Call</strong> : <strong>{booking.totalSeats ?? 0}</strong>}<span>Total Capacity</span></div></div></td>
                  <td data-label="B2B Price (Adult)"><div className="gt-price">{booking.priceOnCall?.adult ? <strong className="gt-on-call">On Call</strong> : <strong>{booking.price?.sellingCurrencyB2B || "PKR"} {(booking.price?.sellingAdultPriceB2B ?? 0).toLocaleString("en-PK")}</strong>}<span>Per Adult</span></div></td>
                  <td className="gt-actions-cell"><div className="gt-row-actions"><Link to={`/group-ticketing/edit/${booking._id}`} className="gt-edit" aria-label={`Edit ${booking.groupName || "group"}`}><TbPencil aria-hidden="true" />Edit</Link><button type="button" className="gt-delete" disabled={busy} onClick={() => { void handleDelete(booking); }} aria-label={`Delete ${booking.groupName || "group"}`}><TbTrash aria-hidden="true" />{deletingId === booking._id ? "Deleting..." : "Delete"}</button><MoreActions booking={booking} busy={busy} onEdit={() => navigate(`/group-ticketing/edit/${booking._id}`)} onDelete={() => { void handleDelete(booking); }} /></div></td>
                </tr>;
              })}</tbody>
            </table>
            {!visibleBookings.length && <div className="gt-empty"><TbUsersGroup aria-hidden="true" /><p>{bookings.length ? "No groups match your filters." : "No groups yet. Create your first group to get started."}</p>{bookings.length > 0 && <button type="button" onClick={() => { setSearchTerm(""); setGroupTypeFilter("All"); setPage(1); }}>Clear filters</button>}</div>}
          </div>
          <div className="gt-pagination-footer"><p aria-live="polite">Showing {sortedBookings.length ? start + 1 : 0} to {Math.min(start + entriesPerPage, sortedBookings.length)} of {sortedBookings.length} entries</p><nav aria-label="Group pagination"><button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><TbChevronLeft aria-hidden="true" /></button>{pageNumbers.map((number, index) => <span className="gt-page-item" key={number}>{index > 0 && number > pageNumbers[index - 1] + 1 && <span className="gt-page-ellipsis">...</span>}<button type="button" aria-label={`Page ${number}`} aria-current={currentPage === number ? "page" : undefined} onClick={() => setPage(number)}>{number}</button></span>)}<button type="button" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}><TbChevronRight aria-hidden="true" /></button></nav></div>
        </>}
      </div>
    </section>
  </div>;
}
