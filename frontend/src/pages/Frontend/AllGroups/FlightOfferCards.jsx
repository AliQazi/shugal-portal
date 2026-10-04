import { FaCheck, FaPlane, FaRegCopy } from "react-icons/fa";
import {
  Armchair,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  Luggage,
  Tag,
  Ticket,
  Utensils,
} from "lucide-react";
import "./flight-offer-cards.css";

const AIRPORT_NAMES = {
  LHR: "London Heathrow",
  JED: "Jeddah",
  LHE: "Lahore",
  ISB: "Islamabad",
  MUX: "Multan",
  LYP: "Faisalabad",
  KHI: "Karachi",
  PEW: "Peshawar",
  SKT: "Sialkot",
  MED: "Madinah",
  RUH: "Riyadh",
  DMM: "Dammam",
  DXB: "Dubai",
  SHJ: "Sharjah",
  MCT: "Muscat",
};

const airportName = (code, raw) => {
  const value = String(raw || "").trim();
  if (value.length > 3 && value.toUpperCase() !== code) return value;
  return AIRPORT_NAMES[code] || code;
};

const shortTime = (value) => String(value || "").slice(0, 5) || "—";

const displayedDays = (group, legs) => {
  if (legs.length < 2) return null;
  let days = group.days;
  const firstRaw = legs[0]?.dep_date || legs[0]?.flight_date;
  const lastRaw = legs[legs.length - 1]?.dep_date || legs[legs.length - 1]?.flight_date;
  if (firstRaw && lastRaw) {
    const diff = Math.round((new Date(lastRaw) - new Date(firstRaw)) / 86400000);
    if (diff > 0) days = diff;
  }
  return days > 0 ? days : null;
};

const displayDate = (value, options = { day: "2-digit", month: "short", year: "numeric" }) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-GB", options) : "—";
};

export default function FlightOfferCards({
  groups,
  airlineLogo,
  airlineName,
  sector,
  user,
  headerType,
  copiedRow,
  handleCopyRow,
  handleBookNow,
  getDisplayDetails,
  getEffectiveSector,
  getEffectiveSeats,
  toAirportCode,
  formatBaggageLabel,
  calculatePriceAfterMargin,
}) {
  const sortedGroups = groups.sort((a, b) => {
    const dateDiff = new Date(a.dept_date) - new Date(b.dept_date);
    if (dateDiff !== 0) return dateDiff;
    return (a.price || 0) - (b.price || 0);
  });

  return (
    <div className="flight-offer-list">
      {sortedGroups.map((group) => {
        const legs = getDisplayDetails(group);
        const firstLeg = legs[0] || {};
        const lastLeg = legs[legs.length - 1] || firstLeg;
        const route = getEffectiveSector(group) || sector;
        const routeStops = route.split("-").filter(Boolean);
        const departureCode = toAirportCode(firstLeg.origin || routeStops[0]) || "—";
        const arrivalCode =
          toAirportCode(lastLeg.destination || routeStops[routeStops.length - 1]) || "—";
        const rawDate = firstLeg.dep_date || firstLeg.flight_date || group.dept_date;
        const arrivalDate = lastLeg.arv_date || lastLeg.arr_date || group.arv_date;
        const departureDateKey = rawDate ? String(rawDate).slice(0, 10) : "";
        const arrivalDateKey = arrivalDate ? String(arrivalDate).slice(0, 10) : "";
        const showArrivalDate = arrivalDateKey && arrivalDateKey !== departureDateKey;
        const groupDays = group.isOwnGroup && Number(group.days) > 0 ? Number(group.days) : null;
        const seatCount = getEffectiveSeats(group);
        const seatsOnCall = seatCount === "Seats on call";
        const seatsHidden = group.isOwnGroup && !group.showSeat;
        const fareOnCall = user?.priceOnCall || group.priceOnCall?.adult;
        const hasMeal = firstLeg.meal && firstLeg.meal !== "No";
        const days = displayedDays(group, legs);
        const logo = group.airline?.logo_url || airlineLogo;
        const name = group.airline?.airline_name || airlineName || "Airline";
        const flightNumbers = legs.map((leg) => leg.flight_no).filter(Boolean).join(" · ");

        return (
          <article key={`${group.source || "admin"}-${group.id}`} className="flight-offer">
            <div className="flight-offer-main">
              <div className="flight-offer-airline">
                {logo ? <img src={logo} alt={name} className="flight-offer-logo" /> : <span className="flight-offer-airline-fallback"><FaPlane size={24} /></span>}
                <strong>{name}</strong>
                {flightNumbers && <span>{flightNumbers}</span>}
              </div>

              <div className="flight-offer-journey">
                <div className="flight-offer-meta">
                  <span className="flight-offer-date"><CalendarDays size={17} aria-hidden="true" /><strong>{displayDate(rawDate)}</strong><span>{displayDate(rawDate, { weekday: "long" })}</span></span>
                  <span className="flight-offer-journey-type">{legs.length > 1 ? `${legs.length} flights` : "Direct flight"}</span>
                  {days > 0 && <span className="flight-offer-trip-length-mobile">{days}-day trip</span>}
                  {groupDays && legs.length === 1 && <span className="flight-offer-journey-type">{groupDays}-day group</span>}
                </div>
                {legs.length > 1 ? (
                  <div className="flight-offer-route-pair">
                    {[firstLeg, lastLeg].map((leg, index) => {
                      const origin = toAirportCode(leg.origin || leg.from || routeStops[index === 0 ? 0 : routeStops.length - 2]);
                      const destination = toAirportCode(leg.destination || leg.to || routeStops[index === 0 ? 1 : routeStops.length - 1]);
                      const departureDate = leg.dep_date || leg.flight_date || (index === 0 ? group.dept_date : null);
                      const arrivalDate = leg.arv_date || leg.arr_date;
                      return (
                        <div className="flight-offer-route" key={index} aria-label={index === 0 ? "Outbound flight" : "Return flight"}>
                          <div className="flight-offer-endpoint">
                            <strong>{origin || "—"}</strong>
                            <span className="flight-offer-subtext">{airportName(origin, leg.origin || leg.from)}</span>
                            <span className="flight-offer-time">{shortTime(leg.dept_time || leg.dep_time || leg.depTime)}</span>
                            <span className="flight-offer-subtext">{displayDate(departureDate, { day: "2-digit", month: "short" })}</span>
                          </div>
                          <div className="flight-offer-route-line">
                            <span className="flight-offer-route-caption">{index === 0 ? "Outbound" : departureCode === arrivalCode ? "Return" : "Final flight"}</span>
                            <span className="flight-offer-track"><FaPlane aria-hidden="true" /></span>
                          </div>
                          <div className="flight-offer-endpoint">
                            <strong>{destination || "—"}</strong>
                            <span className="flight-offer-subtext">{airportName(destination, leg.destination || leg.to)}</span>
                            <span className="flight-offer-time">{shortTime(leg.arv_time || leg.arr_time || leg.arrTime)}</span>
                            {arrivalDate && <span className="flight-offer-subtext">{displayDate(arrivalDate, { day: "2-digit", month: "short" })}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <div className="flight-offer-route">
                  <div className="flight-offer-endpoint">
                    <strong>{departureCode}</strong>
                    <span className="flight-offer-subtext">{airportName(departureCode, firstLeg.origin)}</span>
                    <span className="flight-offer-time">{shortTime(firstLeg.dept_time)}</span>
                    <span className="flight-offer-subtext">{displayDate(rawDate, { day: "2-digit", month: "short" })}</span>
                  </div>
                  <div className="flight-offer-route-line">
                    <span className="flight-offer-track"><FaPlane aria-hidden="true" /></span>
                    <span className="flight-offer-route-type">{legs.length > 1 ? (departureCode === arrivalCode ? "Round trip" : "Multi-leg") : "Non-stop"}</span>
                    {days > 0 && <span className="flight-offer-duration"><Clock3 size={13} /> Trip length: {days} {days === 1 ? "day" : "days"}</span>}
                  </div>
                  <div className="flight-offer-endpoint">
                    <strong>{arrivalCode}</strong>
                    <span className="flight-offer-subtext">{airportName(arrivalCode, lastLeg.destination)}</span>
                    <span className="flight-offer-time">{shortTime(lastLeg.arv_time)}</span>
                    {showArrivalDate && <span className="flight-offer-subtext">{displayDate(arrivalDate, { day: "2-digit", month: "short", year: "numeric" })}</span>}
                  </div>
                </div>
                )}
                {legs.length > 1 && days > 0 && <span className="flight-offer-duration"><Clock3 size={13} /> Trip length: {days} {days === 1 ? "day" : "days"}</span>}
              </div>

              <div className="flight-offer-facts">
                <div className="flight-offer-fact"><Luggage size={18} aria-hidden="true" /><span>Baggage</span><strong>{formatBaggageLabel(firstLeg.baggage) || "—"}</strong></div>
                <div className="flight-offer-fact"><Utensils size={18} aria-hidden="true" /><span>Meal</span><strong className={hasMeal ? "flight-offer-pill flight-offer-pill--green" : "flight-offer-muted"}>{hasMeal ? "Yes" : "No"}</strong></div>
                <div className="flight-offer-fact"><Armchair size={18} aria-hidden="true" /><span>Seats</span><strong className={seatsOnCall ? "flight-offer-pill flight-offer-pill--red" : seatsHidden ? "flight-offer-muted" : ""}>{seatsOnCall ? "On call" : seatsHidden ? "—" : seatCount}</strong></div>
              </div>

              <div className="flight-offer-purchase">
                <span className="flight-offer-fare-label"><Tag size={16} aria-hidden="true" /> Fare</span>
                <strong className={`flight-offer-fare-value${fareOnCall ? " is-on-call" : ""}`}>
                  {fareOnCall ? "On Call" : `${group.priceCurrency || "PKR"} ${calculatePriceAfterMargin(group.price, group)?.toLocaleString()}`}
                </strong>
                <div className="flight-offer-actions">
                  <button type="button" className="flight-offer-book" onClick={() => handleBookNow(group)} disabled={!user?.showHideButton}>
                    <Ticket size={18} aria-hidden="true" /> Book Now <ArrowRight size={18} aria-hidden="true" />
                  </button>
                  {headerType === "dashboard" && (
                    <button type="button" className={`flight-offer-copy ${copiedRow[group.id] ? "is-copied" : ""}`} onClick={() => handleCopyRow(group)} title="Copy this flight/group data">
                      {copiedRow[group.id] ? <FaCheck size={16} /> : <FaRegCopy size={16} />}
                      {copiedRow[group.id] ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <details className="flight-offer-details">
              <summary><span><FaPlane aria-hidden="true" /> Flight details</span><small>{legs.length} {legs.length === 1 ? "flight" : "flights"}{flightNumbers ? ` · ${flightNumbers}` : ""}</small><ChevronDown size={17} aria-hidden="true" /></summary>
              <div className="flight-offer-legs">
                {legs.length === 0 && <p className="flight-offer-no-legs">Flight schedule not available.</p>}
                {legs.map((leg, index) => {
                  const legDate = leg.dep_date || leg.flight_date;
                  const legDepartureCode = toAirportCode(leg.origin) || "—";
                  const legArrivalCode = toAirportCode(leg.destination) || "—";
                  return (
                    <div className="flight-offer-leg" key={`${group.id}-${index}`}>
                      <div className="flight-offer-leg-header"><span>Flight {index + 1}</span><strong>{leg.flight_no || "—"}</strong><time>{displayDate(legDate)}</time></div>
                      <div className="flight-offer-leg-route">
                        <div><strong>{legDepartureCode}</strong><span>{airportName(legDepartureCode, leg.origin)}</span><b>{shortTime(leg.dept_time)}</b></div>
                        <span className="flight-offer-leg-arrow"><FaPlane aria-hidden="true" /></span>
                        <div><strong>{legArrivalCode}</strong><span>{airportName(legArrivalCode, leg.destination)}</span><b>{shortTime(leg.arv_time)}</b>{leg.arv_date && <small>{displayDate(leg.arv_date)}</small>}</div>
                      </div>
                      <div className="flight-offer-leg-extras">
                        <span><Luggage size={15} /> Baggage: {formatBaggageLabel(leg.baggage) || "—"}</span>
                        <span><Utensils size={15} /> Meal: {leg.meal && leg.meal !== "No" ? "Yes" : "No"}</span>
                        {(leg.flight_class || leg.flightClass) && <span>Class: {leg.flight_class || leg.flightClass}</span>}
                        {(leg.from_terminal || leg.fromTerminal) && <span>From: {leg.from_terminal || leg.fromTerminal}</span>}
                        {(leg.to_terminal || leg.toTerminal) && <span>To: {leg.to_terminal || leg.toTerminal}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          </article>
        );
      })}
    </div>
  );
}
