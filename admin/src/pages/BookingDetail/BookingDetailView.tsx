import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeftIcon, BanknotesIcon, BookmarkIcon, BriefcaseIcon,
  BuildingOffice2Icon, CalendarDaysIcon, CheckCircleIcon, CheckIcon,
  ClipboardDocumentIcon, CurrencyDollarIcon, DocumentTextIcon,
  IdentificationIcon, MapPinIcon, PaperAirplaneIcon,
  TicketIcon, UserIcon, UsersIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../../components/common/PageMeta";
import heroImage from "../../assets/images/agent-detail-sky.png";
import type { Booking } from "./index";
import "./booking-detail.css";

type Props = {
  booking: Booking;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  discountAmount: number;
  setDiscountAmount: (value: number) => void;
  isUpdating: boolean;
  isSavingDiscount: boolean;
  onStatusChange: () => void;
  onDiscountSave: () => void;
};

const formatDate = (value?: string, includeTime = false) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + (includeTime ? ` ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "");
};
const money = (value?: number) => `PKR ${Number(value || 0).toLocaleString("en-PK")}`;
const statusText = (value: string) => value ? value.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Unknown";

const SectionTitle = ({ icon, title, subtitle, extra }: { icon: ReactNode; title: string; subtitle: string; extra?: ReactNode }) => (
  <div className="booking-detail-section-title"><span className="booking-detail-icon">{icon}</span><div><h2>{title}</h2><p>{subtitle}</p></div>{extra && <div className="booking-detail-title-extra">{extra}</div>}</div>
);

const HeroFact = ({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) => (
  <div className="booking-detail-hero-fact"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>
);

const SummaryFact = ({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) => (
  <div className="booking-detail-summary-fact"><span>{icon}</span><div><small>{label}</small><strong>{children}</strong></div></div>
);

const PricingRow = ({ label, value, tone }: { label: string; value?: number; tone?: "blue" | "red" | "amber" }) => (
  <div className={`booking-detail-pricing-row ${tone || ""}`}><span>{label}</span><strong>{tone === "amber" ? "+" : ""}{money(value)}</strong></div>
);

const CopyReferenceButton = ({ reference, compact = false }: { reference: string; compact?: boolean }) => {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reference);
      } else {
        const input = document.createElement("textarea");
        input.value = reference;
        input.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Copy failed");
      }
      setState("copied");
    } catch {
      setState("error");
    }
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setState("idle"), 2200);
  };

  return <span className={`booking-detail-copy ${compact ? "compact" : ""} ${state !== "idle" ? `is-${state}` : ""}`}>
    <button type="button" onClick={copy} aria-label="Copy booking reference">{state === "copied" ? <CheckIcon /> : <ClipboardDocumentIcon />}</button>
    <span className="booking-detail-copy-tooltip" role="status" aria-live="polite">{state === "copied" ? "Copied!" : state === "error" ? "Copy failed" : "Copy reference"}</span>
  </span>;
};

export default function BookingDetailView({ booking, selectedStatus, setSelectedStatus, discountAmount, setDiscountAmount, isUpdating, isSavingDiscount, onStatusChange, onDiscountSave }: Props) {
  const navigate = useNavigate();
  const passenger = booking.passengers?.[0];
  const contactName = booking.contactPersonName || [passenger?.givenName, passenger?.surName].filter(Boolean).join(" ") || "N/A";
  const totalPassengers = booking.totalPassengers ?? ((booking.adultsCount || 0) + (booking.childrenCount || 0) + (booking.infantsCount || 0));

  return <div className="booking-detail-page">
    <PageMeta title="Booking Details" description="View and manage booking details" />
    <div className="booking-detail-breadcrumb">Home <span>›</span> Bookings <span>›</span> Booking Details</div>
    <header className="booking-detail-page-heading"><span className="booking-detail-page-icon"><PaperAirplaneIcon /></span><div><h1>Booking Details</h1><p>View and manage booking information, passenger details, pricing and flight details.</p></div><button type="button" onClick={() => navigate(-1)}><ArrowLeftIcon /> Back</button></header>
    <div className="booking-detail-layout"><main className="booking-detail-main">
      <section className="booking-detail-hero">
        <div className="booking-detail-hero-top" style={{ backgroundImage: `linear-gradient(90deg, #f3f9ff 0%, #eff7ffeb 48%, #e3f2ff70 78%), url(${heroImage})` }}>
          <span className="booking-detail-icon"><TicketIcon /></span><div className="booking-detail-hero-reference"><small>Booking Reference</small><div><h2>{booking.bookingReference}</h2><CopyReferenceButton reference={booking.bookingReference} /></div><p>Created on {formatDate(booking.createdAt)}</p></div>
          <span className={`booking-detail-status ${booking.status}`}><CheckCircleIcon />{statusText(booking.status)}</span>
        </div>
        <div className="booking-detail-hero-facts">
          <HeroFact icon={<UserIcon />} label="Contact Person" value={contactName} />
          <HeroFact icon={<BuildingOffice2Icon />} label="Airline" value={booking.airline?.name || "N/A"} />
          <HeroFact icon={<MapPinIcon />} label="Sector" value={booking.sector || "N/A"} />
          <HeroFact icon={<CalendarDaysIcon />} label="Departure Date" value={formatDate(booking.departureDate)} />
          <HeroFact icon={<CalendarDaysIcon />} label="Arrival Date" value={formatDate(booking.arrivalDate)} />
          <HeroFact icon={<DocumentTextIcon />} label="PNR" value={booking.pnr || "N/A"} />
        </div>
      </section>

      <section className="booking-detail-card booking-detail-status-card"><SectionTitle icon={<CheckCircleIcon />} title="Booking Status" subtitle="Update the current status of this booking." /><div className="booking-detail-status-controls"><select aria-label="Booking status" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}><option value="on hold">On Hold</option>{booking.status === "pending" && <option value="pending" disabled>Pending</option>}<option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option></select><button type="button" onClick={onStatusChange} disabled={selectedStatus === booking.status || isUpdating}><BookmarkIcon />{isUpdating ? "Updating..." : "Update"}</button></div></section>

      <section className="booking-detail-card"><SectionTitle icon={<UsersIcon />} title="Passenger Breakdown" subtitle="Total number of passengers in this booking." extra={<span className="booking-detail-count"><UsersIcon />Total Passengers: {totalPassengers}</span>} /><div className="booking-detail-passenger-counts"><div className="adults"><span><UserIcon /></span><strong>{booking.adultsCount || 0}</strong><small>Adults</small></div><div className="children"><span><UsersIcon /></span><strong>{booking.childrenCount || 0}</strong><small>Children</small></div><div className="infants"><span><UserIcon /></span><strong>{booking.infantsCount || 0}</strong><small>Infants</small></div></div></section>

      <section className="booking-detail-card"><SectionTitle icon={<BanknotesIcon />} title="Pricing Breakdown" subtitle="Detailed pricing information for this booking." /><div className="booking-detail-pricing">
        {(booking.adultsCount || 0) > 0 && <><PricingRow label={`Adult Base Price (x${booking.adultsCount})`} value={booking.pricing?.adultBasePrice ?? booking.pricing?.adultPrice} />{booking.pricing?.adultBasePrice !== undefined && booking.pricing.adultPrice !== booking.pricing.adultBasePrice && <PricingRow label="Margin per Adult" value={(booking.pricing.adultPrice || 0) - booking.pricing.adultBasePrice} tone="amber" />}<PricingRow label={`Adult Final Price (x${booking.adultsCount})`} value={booking.pricing?.adultPrice} /><PricingRow label="Adult Total" value={booking.pricing?.adultTotal} tone="blue" /></>}
        {(booking.childrenCount || 0) > 0 && <div className="booking-detail-pricing-group"><PricingRow label={`Child Base Price (x${booking.childrenCount})`} value={booking.pricing?.childBasePrice ?? booking.pricing?.childPrice} />{booking.pricing?.childBasePrice !== undefined && booking.pricing.childPrice !== booking.pricing.childBasePrice && <PricingRow label="Margin per Child" value={(booking.pricing.childPrice || 0) - booking.pricing.childBasePrice} tone="amber" />}<PricingRow label={`Child Final Price (x${booking.childrenCount})`} value={booking.pricing?.childPrice} /><PricingRow label="Child Total" value={booking.pricing?.childTotal} tone="blue" /></div>}
        {(booking.infantsCount || 0) > 0 && <div className="booking-detail-pricing-group"><PricingRow label={`Infant Base Price (x${booking.infantsCount})`} value={booking.pricing?.infantBasePrice ?? booking.pricing?.infantPrice} />{booking.pricing?.infantBasePrice !== undefined && booking.pricing.infantPrice !== booking.pricing.infantBasePrice && <PricingRow label="Margin per Infant" value={(booking.pricing.infantPrice || 0) - booking.pricing.infantBasePrice} tone="amber" />}<PricingRow label={`Infant Final Price (x${booking.infantsCount})`} value={booking.pricing?.infantPrice} /><PricingRow label="Infant Total" value={booking.pricing?.infantTotal} tone="blue" /></div>}
        <div className="booking-detail-pricing-group"><PricingRow label="Discount Applied" value={booking.pricing?.discountAmount} tone="red" /><div className="booking-detail-discount"><label htmlFor="booking-discount">Discount Amount</label><input id="booking-discount" type="number" min="0" value={discountAmount} onChange={(event) => setDiscountAmount(Number(event.target.value))} /><button type="button" onClick={onDiscountSave} disabled={isSavingDiscount}><BookmarkIcon />{isSavingDiscount ? "Saving..." : "Save Discount"}</button></div></div>
        <div className="booking-detail-grand-total"><span><BanknotesIcon />Grand Total</span><strong>{money(booking.pricing?.grandTotal)}</strong></div>
      </div></section>

      <section className="booking-detail-card"><SectionTitle icon={<UsersIcon />} title="Passenger List" subtitle="List of all passengers in this booking." />{booking.passengers?.length ? <div className="booking-detail-table-wrap"><table><thead><tr><th>#</th><th>Name</th><th>Type</th><th>Passport</th><th>Passport Expiry</th><th>DOB</th><th>Document</th></tr></thead><tbody>{booking.passengers.map((item, index) => <tr key={index}><td>{index + 1}</td><td>{[item.title, item.givenName, item.surName].filter(Boolean).join(" ")}</td><td><span className={`booking-detail-type ${item.type?.toLowerCase()}`}>{item.type}</span></td><td>{item.passport || "N/A"}</td><td>{formatDate(item.passportExpiry)}</td><td>{formatDate(item.dateOfBirth)}</td><td>{item.documentUrl ? <a href={item.documentUrl} target="_blank" rel="noreferrer">View document</a> : "—"}</td></tr>)}</tbody></table></div> : <p className="booking-detail-empty">No passenger details have been added yet.</p>}</section>

      <section className="booking-detail-card"><SectionTitle icon={<PaperAirplaneIcon />} title="Flight Details" subtitle="Flight information for this booking." />{booking.flights?.length ? booking.flights.map((flight, index) => <div className="booking-detail-flight" key={index}><div className="booking-detail-flight-heading"><span className="booking-detail-icon"><PaperAirplaneIcon /></span><div><strong>Flight {index + 1}: {flight.flightNo || "N/A"}</strong><small>{booking.airline?.name || "N/A"}</small></div><span className={`booking-detail-status ${booking.status}`}><CheckCircleIcon />{statusText(booking.status)} Flight</span></div><div className="booking-detail-flight-grid"><div><PaperAirplaneIcon /><small>Origin</small><strong>{flight.origin || "N/A"}</strong></div><div><PaperAirplaneIcon /><small>Destination</small><strong>{flight.destination || "N/A"}</strong></div><div><CalendarDaysIcon /><small>Departure</small><strong>{formatDate(flight.depDate || booking.departureDate)} {flight.depTime || ""}</strong></div><div><CalendarDaysIcon /><small>Arrival</small><strong>{formatDate(flight.arrDate || booking.arrivalDate)} {flight.arrTime || ""}</strong></div><div><BriefcaseIcon /><small>Baggage</small><strong>{flight.baggage || "N/A"}</strong></div><div><IdentificationIcon /><small>Meal</small><strong>{flight.meal || "N/A"}</strong></div></div></div>) : <p className="booking-detail-empty">No flight segments are available for this booking.</p>}</section>
    </main>
    <aside className="booking-detail-sidebar"><section className="booking-detail-card"><SectionTitle icon={<BookmarkIcon />} title="Booking Summary" subtitle="" /><div className="booking-detail-summary-list"><SummaryFact icon={<CalendarDaysIcon />} label="Reference"><span className="booking-detail-reference-value">{booking.bookingReference}<CopyReferenceButton reference={booking.bookingReference} compact /></span></SummaryFact><SummaryFact icon={<CheckCircleIcon />} label="Status"><span className={`booking-detail-status ${booking.status}`}><CheckCircleIcon />{statusText(booking.status)}</span></SummaryFact><SummaryFact icon={<UsersIcon />} label="Total Passengers">{totalPassengers}</SummaryFact><SummaryFact icon={<BanknotesIcon />} label="Grand Total"><span className="booking-detail-summary-total">{money(booking.pricing?.grandTotal)}</span></SummaryFact><SummaryFact icon={<CalendarDaysIcon />} label="Booked on">{formatDate(booking.createdAt)}</SummaryFact>{booking.sabaoonBookingStatus && booking.sabaoonBookingStatus !== "not_applicable" && <SummaryFact icon={<CheckCircleIcon />} label="Sabaoon Status">{statusText(booking.sabaoonBookingStatus)}</SummaryFact>}{booking.sabaoonTransactionId && <SummaryFact icon={<CurrencyDollarIcon />} label="Sabaoon Transaction ID">{booking.sabaoonTransactionId}</SummaryFact>}</div></section></aside>
    </div>
  </div>;
}
