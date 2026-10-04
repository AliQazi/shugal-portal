import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Clock3, Coins, FileText, Info, Mail, MapPin, Phone,
  Plane, ReceiptText, Route, UserRound, UsersRound,
} from "lucide-react";
import worldMapUrl from "../assets/images/ticket-world-map.png";
import skylineUrl from "../assets/images/ticket-generic-skyline.png";

type Booking = Record<string, any>;

const escapeHTML = (value: unknown): string => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character] || character));

const display = (value: unknown, fallback = "N/A") => escapeHTML(value === undefined || value === null || value === "" ? fallback : value);
const upper = (value: unknown) => String(value ?? "").toUpperCase();
const money = (value: unknown) => {
  const amount = Number(value || 0);
  return `PKR ${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-PK")}`;
};
const icon = (component: typeof Plane) => renderToStaticMarkup(createElement(component, { size: 21, strokeWidth: 2.2, "aria-hidden": true }));

const dateText = (value: unknown) => {
  if (!value) return "N/A";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? display(value) : escapeHTML(date.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }));
};

const storedAgent = (): Booking => {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const user = JSON.parse(storage.getItem("frontend_user") || "null");
      if (user) return user;
    } catch { /* Ignore outdated stored profile data. */ }
  }
  return {};
};

const imageURL = (value: unknown) => {
  const url = String(value || "");
  if (/^(https?:\/\/|data:image\/|blob:)/i.test(url)) return escapeHTML(url);
  return url && !/^[a-z][a-z\d+.-]*:/i.test(url) && !url.startsWith("//") ? escapeHTML(url) : "";
};

const normalizedSegments = (booking: Booking) => {
  const flights = Array.isArray(booking.flights) && booking.flights.length ? booking.flights : [{}];
  const sectorMatch = String(booking.sector || "").toUpperCase().match(/([A-Z]{3})\s*-\s*([A-Z]{3})/);
  return flights.map((flight: Booking) => ({
    airline: flight.airlineName || booking.airline?.name || "N/A",
    number: flight.flightNo || flight.flightNumber || booking.flightNumber || "N/A",
    origin: upper(flight.originCode || flight.origin || flight.sectorFrom || booking.originCode || booking.originIata || sectorMatch?.[1] || "N/A"),
    destination: upper(flight.destinationCode || flight.destination || flight.sectorTo || booking.destinationCode || booking.destinationIata || sectorMatch?.[2] || "N/A"),
    date: dateText(flight.depDate || flight.flightDate || booking.departureDate),
    departure: flight.depTime || booking.depTime || "N/A",
    arrival: flight.arrTime || booking.arrTime || "N/A",
    baggage: flight.baggage || flight.baggageWeight || booking.baggageWeight || "N/A",
  }));
};

export const buildGDSBookingTicketHTML = (booking: Booking, showFare = true): string => {
  const segments = normalizedSegments(booking);
  const first = segments[0];
  const airlineName = booking.airline?.name || booking.flights?.[0]?.airlineName || "Airline";
  const airlineLogo = imageURL(booking.airline?.logoUrl || booking.flights?.[0]?.airlineLogo);
  const route = segments.reduce<string[]>((stops, segment) => {
    if (segment.origin !== "N/A" && stops[stops.length - 1] !== segment.origin) stops.push(segment.origin);
    if (segment.destination !== "N/A" && stops[stops.length - 1] !== segment.destination) stops.push(segment.destination);
    return stops;
  }, []).join(" - ") || upper(booking.sector || "N/A");
  const status = upper(booking.status || booking.bookingStatus || "N/A");
  const pnr = booking.pnr || booking.bookingReference;
  const showPNR = /confirmed/i.test(status) && pnr;
  const price = booking.pricing?.grandTotal ?? booking.price ?? booking.amount ?? 0;
  const passengers = Array.isArray(booking.passengers) && booking.passengers.length ? booking.passengers : [{ givenName: "Passenger", surName: "Name", type: "Adult" }];
  const agent = typeof booking.userId === "object" && booking.userId ? booking.userId : {};
  const stored = storedAgent();
  const agentName = agent.name || booking.contactPersonName || booking.issuedBy || stored.name || "N/A";
  const agentEmail = agent.email || booking.contactEmail || booking.email || stored.email || "N/A";
  const agentPhone = agent.phone || booking.contactPhone || booking.phone || stored.phone || "N/A";
  const agentCity = agent.city || booking.city || stored.city || agent.address || booking.address || stored.address || "N/A";
  const fareByType: Record<string, unknown> = {
    adult: booking.pricing?.adultPrice ?? 0,
    child: booking.pricing?.childPrice ?? 0,
    infant: booking.pricing?.infantPrice ?? 0,
  };
  const cards = [
    `<div class="summary-card flight"><span class="card-icon">${icon(Plane)}</span><div><small>Flight</small><strong>${display(upper(airlineName))} ${display(first.number)}</strong></div></div>`,
    `<div class="summary-card route"><span class="card-icon">${icon(Route)}</span><div><small>Route</small><strong>${display(route)}</strong></div></div>`,
    `<div class="summary-card status"><span class="card-icon">${icon(Clock3)}</span><div><small>Status</small><strong>${display(status)}</strong></div></div>`,
    showFare ? `<div class="summary-card price"><span class="card-icon">${icon(Coins)}</span><div><small>Price (PKR)</small><strong>${money(price)}</strong></div></div>` : "",
  ].join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Electronic Ticket / Itinerary Receipt</title><style>
    @page{size:A4 portrait;margin:10mm}
    *{box-sizing:border-box}html,body{margin:0;padding:0}body{background:#fff;color:#0c1c3a;font:12px/1.45 Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .ticket{max-width:820px;margin:auto;padding:24px 26px 20px}.ticket-header{position:relative;display:flex;align-items:center;min-height:133px;margin-bottom:18px;overflow:hidden}
    .ticket-header:before{content:"";position:absolute;inset:0 0 0 42%;background:url('${worldMapUrl}') right center/contain no-repeat;opacity:.76;pointer-events:none}
    .brand-logo{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;width:205px;height:92px;flex:none;padding-right:17px;border-right:1px solid #a8c3bf}
    .brand-logo img{max-width:100%;max-height:92px;object-fit:contain}.brand-logo .fallback{color:#06523e;font:bold 28px Georgia,serif;text-align:center;line-height:1.05}
    .brand-heading{position:relative;z-index:1;padding-left:18px;min-width:0}.brand-heading h1{max-width:510px;margin:0;color:#073e34;font:700 22px/1.1 Georgia,'Times New Roman',serif;text-transform:uppercase}
    .brand-heading p{margin:6px 0 0;color:#143f3b;font-size:13px;letter-spacing:3px}.reference{margin-top:7px;color:#315f59;font-size:11px;font-weight:700;letter-spacing:1px}
    .summary{display:grid;grid-template-columns:repeat(${showFare ? 4 : 3},minmax(0,1fr));gap:10px;margin-bottom:20px}
    .summary-card{display:flex;align-items:flex-start;gap:10px;min-height:111px;padding:14px 12px;border:1px solid #d9e9e4;border-radius:12px;background:#f3faf7;break-inside:avoid}
    .summary-card.route{background:#f1f8fe;border-color:#d5e7f8}.summary-card.status{background:#fffaf0;border-color:#f2e6c9}.summary-card.price{background:#f3faf7}
    .card-icon{display:grid;place-items:center;width:40px;height:40px;flex:none;border-radius:50%;background:#0e7453;color:#fff}.route .card-icon{background:#236fa9}.status .card-icon{background:#cba044}.price .card-icon{background:#177d62}
    .summary-card small{display:block;margin:6px 0 6px;color:#54746f;font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase}.route small{color:#3978aa}.status small{color:#777d71}
    .summary-card strong{display:block;overflow-wrap:anywhere;color:#0c2740;font-size:14px;line-height:1.4}.status strong{color:#9d6500}.price strong{color:#07553f;white-space:nowrap}
    .ticket-section{margin-bottom:17px;border:1px solid #d6e1e9;border-radius:9px;overflow:hidden;break-inside:avoid}
    .section-heading{display:flex;align-items:center;min-height:42px;background:#f2f8fa}.section-heading .section-icon{display:grid;place-items:center;width:52px;height:42px;flex:none;background:#0a5b44;color:#fff}.section-heading.blue .section-icon{background:#145d8a}
    .section-heading h2{margin:0;padding:0 14px;color:#0d2344;font:700 18px Georgia,'Times New Roman',serif;text-transform:uppercase}.section-heading .tagline{margin-left:auto;padding-right:14px;color:#91a5b2;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase}
    .section-body{padding:10px 12px 12px}table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;border:1px solid #dce7ef;border-radius:7px;overflow:hidden}
    th,td{padding:10px 8px;border-right:1px solid #e1e9ef;border-bottom:1px solid #e1e9ef;text-align:left;vertical-align:middle;overflow-wrap:anywhere}
    th{background:#eff7f7;color:#0c2444;font-weight:700}th:last-child,td:last-child{border-right:0}tbody tr:last-child td{border-bottom:0}.passenger-table th{background:#eef6fd}.passenger-table .name{font-weight:700}
    .grand-total{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;padding:11px 15px;border-radius:7px;background:#edf7f2;color:#0b2842;font-size:17px;font-weight:700;text-transform:uppercase}.grand-total span{display:flex;align-items:center;gap:11px}.grand-total svg{color:#086348}.grand-total strong{color:#075942;font:700 23px Georgia,serif;white-space:nowrap}
    .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.detail-grid .ticket-section{margin-bottom:0}.detail-grid .section-body{padding:10px 16px}
    .detail-row{display:grid;grid-template-columns:22px 105px minmax(0,1fr);align-items:center;gap:9px;min-height:41px;border-bottom:1px solid #e6edf1}.detail-row:last-child{border-bottom:0}.detail-row svg{color:#0a504a}.detail-row b{overflow-wrap:anywhere;font-weight:700}
    .important-list{margin:0;padding:0;list-style:none;counter-reset:important}.important-list li{display:flex;align-items:flex-start;gap:10px;padding:5px 0;line-height:1.35}.important-list li:before{counter-increment:important;content:counter(important);display:grid;place-items:center;width:25px;height:25px;flex:none;border-radius:50%;background:#e0f1e9;color:#087050;font-weight:700}
    .ticket-footer{position:relative;display:flex;align-items:center;justify-content:space-between;min-height:75px;margin-top:19px;padding-top:12px;border-top:1px dashed #d7e3e6;overflow:hidden}.ticket-footer:before{content:"";position:absolute;inset:0 0 0 35%;background:url('${skylineUrl}') right bottom/contain no-repeat;pointer-events:none}.city-pill{position:relative;z-index:1;display:inline-flex;align-items:center;gap:8px;max-width:40%;padding:7px 14px;border:1px solid #b7cccf;border-radius:30px;background:#fff;color:#24435b;overflow-wrap:anywhere}.city-pill svg{color:#086348}
    @media screen and (max-width:680px){.ticket{padding:18px 10px}.ticket-header{min-height:105px}.brand-logo{width:125px;height:75px}.brand-logo img{max-height:70px}.brand-heading h1{font-size:16px}.brand-heading p{font-size:10px;letter-spacing:1px}.summary{grid-template-columns:repeat(2,minmax(0,1fr))}.summary-card{min-height:95px}.detail-grid{grid-template-columns:1fr}.ticket-section{overflow-x:auto}.section-heading .tagline{display:none}table{min-width:570px}}
    @media print{.ticket{max-width:none;padding:0}.ticket-section{break-inside:avoid}.detail-grid{break-inside:avoid}.summary-card{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body><img src="${worldMapUrl}" alt="" style="display:none"><img src="${skylineUrl}" alt="" style="display:none"><main class="ticket">
    <header class="ticket-header"><div class="brand-logo">${airlineLogo ? `<img src="${airlineLogo}" alt="${display(airlineName)} logo">` : `<span class="fallback">${display(airlineName)}</span>`}</div><div class="brand-heading"><h1>${display(airlineName)}</h1><p>Electronic Ticket / Itinerary Receipt</p>${showPNR ? `<div class="reference">PNR: ${display(pnr)}</div>` : ""}</div></header>
    <section class="summary" aria-label="Booking summary">${cards}</section>
    <section class="ticket-section"><div class="section-heading"><span class="section-icon">${icon(Plane)}</span><h2>Flight Segments</h2><span class="tagline">Safe journey&nbsp;&nbsp; Higher tomorrow</span></div><div class="section-body"><table><thead><tr><th style="width:17%">Airline</th><th style="width:11%">Flight</th><th style="width:17%">Route</th><th style="width:17%">Departure Date</th><th style="width:14%">Departure Time</th><th style="width:13%">Arrival Time</th><th style="width:11%">Baggage</th></tr></thead><tbody>${segments.map((segment) => `<tr><td>${display(segment.airline)}</td><td>${display(segment.number)}</td><td>${display(segment.origin)} - ${display(segment.destination)}</td><td>${segment.date}</td><td>${display(segment.departure)}</td><td>${display(segment.arrival)}</td><td>${display(segment.baggage)}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="ticket-section"><div class="section-heading blue"><span class="section-icon">${icon(UsersRound)}</span><h2>Passenger(s)</h2></div><div class="section-body"><table class="passenger-table"><thead><tr><th style="width:7%">No.</th><th style="width:${showFare ? 25 : 31}%">Name</th><th style="width:12%">Type</th><th style="width:${showFare ? 19 : 25}%">Passport</th><th style="width:18%">Nationality</th>${showFare ? '<th style="width:19%">Fare</th>' : ""}</tr></thead><tbody>${passengers.map((passenger: Booking, index: number) => {
      const type = String(passenger.type || "adult").toLowerCase();
      const name = [passenger.title, passenger.givenName, passenger.surName].filter(Boolean).join(" ") || "Passenger";
      return `<tr><td>${index + 1}</td><td class="name">${display(name)}</td><td>${display(type)}</td><td>${display(passenger.passport || passenger.passportNumber)}</td><td>${display(passenger.nationality || "PK")}</td>${showFare ? `<td>${money(fareByType[type] ?? fareByType.adult)}</td>` : ""}</tr>`;
    }).join("")}</tbody></table>${showFare ? `<div class="grand-total"><span>${icon(ReceiptText)} Grand Total</span><strong>${money(price)}</strong></div>` : ""}</div></section>
    <div class="detail-grid"><section class="ticket-section"><div class="section-heading blue"><span class="section-icon">${icon(FileText)}</span><h2>Issued By</h2></div><div class="section-body"><div class="detail-row">${icon(UserRound)}<span>Agent Name</span><b>${display(agentName)}</b></div><div class="detail-row">${icon(Mail)}<span>Contact Email</span><b>${display(agentEmail)}</b></div><div class="detail-row">${icon(Phone)}<span>Phone</span><b>${display(agentPhone)}</b></div></div></section>
    <section class="ticket-section"><div class="section-heading"><span class="section-icon">${icon(Info)}</span><h2>Important</h2></div><div class="section-body"><ol class="important-list"><li>Arrive at the airport at least 4 hours before departure.</li><li>Valid government photo ID is required.</li><li>Baggage allowances may vary by airline and fare.</li></ol></div></section></div>
    <footer class="ticket-footer"><span class="city-pill">${icon(MapPin)} ${display(agentCity)}</span></footer>
  </main></body></html>`;
};

export const printGDSBooking = (booking: Booking, showFare = true): void => {
  const iframe = document.createElement("iframe");
  iframe.title = "Print ticket";
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  const cleanup = () => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); };
  iframe.onload = async () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) return cleanup();
    const images = Array.from(frameWindow.document.images);
    const imageLoading = Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
      image.onload = image.onerror = () => resolve();
    })));
    await Promise.race([imageLoading, new Promise<void>((resolve) => window.setTimeout(resolve, 4000))]);
    frameWindow.addEventListener("afterprint", cleanup, { once: true });
    frameWindow.focus();
    frameWindow.print();
  };
  iframe.srcdoc = buildGDSBookingTicketHTML(booking, showFare);
  document.body.appendChild(iframe);
  window.setTimeout(cleanup, 60000);
};
