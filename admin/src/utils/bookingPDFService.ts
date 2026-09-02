import defaultCompanyLogo from "../assets/images/logo2-.png";

export const printGDSBooking = (booking: any, showPrice = true): void => {
  // --- 1. Helper Functions ---
  const formatFullDate = (dateStr: string | Date | undefined): string => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // --- 2. Data Preparation (unchanged) ---
  const flight = booking.flights?.[0] || {};

  const bookingStatusRaw = booking.status || booking.bookingStatus || "N/A";
  const bookingStatus = bookingStatusRaw.toUpperCase();

  const airlineName = (
    booking.airline?.name ||
    flight.airlineName ||
    "AIRLINE"
  ).toUpperCase();

  const airlineLogo = booking.airline?.logoUrl || flight.airlineLogo || "";

  // Agent's own uploaded logo, falling back to the default Shaheen Wings logo.
  const agentLogo =
    (booking.userId && booking.userId.logo) || defaultCompanyLogo;

  const pnr = booking.pnr || booking.bookingReference || "N/A";
  const bookingRef = booking.bookingReference || pnr;

  const flightNum = booking.flightNumber || flight.flightNo || "XX000";

  let originCode = (
    booking.originCode ||
    flight.originCode ||
    booking.originIata ||
    flight.sectorFrom ||
    ""
  ).toUpperCase();

  let destCode = (
    booking.destinationCode ||
    flight.destinationCode ||
    booking.destinationIata ||
    flight.sectorTo ||
    ""
  ).toUpperCase();

  if ((!originCode || originCode.trim() === "") && booking.sector) {
    const sectorMatch = booking.sector.match(/([A-Z]{3})-([A-Z]{3})/);
    if (sectorMatch) originCode = sectorMatch[1];
  }
  if ((!destCode || destCode.trim() === "") && booking.sector) {
    const sectorMatch = booking.sector.match(/([A-Z]{3})-([A-Z]{3})/);
    if (sectorMatch) destCode = sectorMatch[2];
  }

  originCode = originCode || "N/A";
  destCode = destCode || "N/A";

  const depTime = flight.depTime || booking.depTime || "00:00";
  const arrTime = flight.arrTime || booking.arrTime || "00:00";
  const depDate = formatFullDate(booking.departureDate);

  const safeUpper = (value: any): string => (value ? String(value).toUpperCase() : "");
  const safeValue = (value: any, fallback = "N/A"): string =>
    value !== undefined && value !== null && value !== "" ? String(value) : fallback;

  const segments: Array<{
    airline: string;
    flightNo: string;
    origin: string;
    destination: string;
    depDate: string;
    depTime: string;
    arrTime: string;
  }> =
    Array.isArray(booking.flights) && booking.flights.length > 0
      ? booking.flights.map((fl: any) => ({
          airline: booking.airline?.name || fl.airlineName || "AIRLINE",
          flightNo: fl.flightNo || fl.flightNumber || flightNum,
          origin: safeUpper(fl.origin || fl.sectorFrom || originCode),
          destination: safeUpper(fl.destination || fl.sectorTo || destCode),
          depDate: formatFullDate(fl.depDate || fl.flightDate || booking.departureDate),
          depTime: fl.depTime || depTime || "00:00",
          arrTime: fl.arrTime || arrTime || "00:00",
        }))
      : [
          {
            airline: airlineName,
            flightNo: flightNum, // FIXED: was 'flight' (incorrect)
            origin: originCode,
            destination: destCode,
            depDate,
            depTime,
            arrTime,
          },
        ];

  const routePoints = segments.reduce<string[]>((acc, segment) => {
    if (segment.origin && segment.origin !== "N/A") {
      if (!acc.length || acc[acc.length - 1] !== segment.origin) acc.push(segment.origin);
    }
    if (segment.destination && segment.destination !== "N/A") {
      acc.push(segment.destination);
    }
    return acc;
  }, []);

  const sector = routePoints.length
    ? routePoints.join(" - ")
    : `${originCode} - ${destCode}`;

  const adultPrice = booking.pricing?.adultPrice ?? 0;
  const childPrice = booking.pricing?.childPrice ?? 0;
  const infantPrice = booking.pricing?.infantPrice ?? 0;
  const grandTotal = booking.pricing?.grandTotal ?? booking.price ?? booking.amount ?? 0;

  const passengerFarePerType: Record<string, number> = {
    adult: adultPrice,
    child: childPrice,
    infant: infantPrice,
  };

  const getPassengerFare = (type: any): string => {
    const key = String(type || "adult").toLowerCase();
    return `PKR ${Number(passengerFarePerType[key] ?? adultPrice).toLocaleString()}`;
  };

  const passengers: any[] =
    booking.passengers && booking.passengers.length > 0
      ? booking.passengers
      : [
          {
            type: booking.passengers?.[0]?.type || "Adult",
            title: booking.passengers?.[0]?.title || "",
            givenName: booking.passengers?.[0]?.givenName || "PASSENGER",
            surName: booking.passengers?.[0]?.surName || "NAME",
            passport: "N/A",
          },
        ];

  // --- 3. Build the HTML Ticket String (unchanged) ---
  const showPNR = !/hold/i.test(bookingStatusRaw);

  const priceAmount = booking.pricing?.grandTotal || booking.price || booking.amount || 0;
  const priceHTML = showPrice
    ? `<div class="sum-card">
      <div class="sum-label">PRICE (PKR)</div>
      <div class="sum-val">PKR ${Number(priceAmount).toLocaleString()}</div>
    </div>`
    : "";

  const pnrHTML = showPNR
    ? `<div class="sum-card">
      <div class="sum-label">PNR</div>
      <div class="sum-val">${pnr}</div>
    </div>`
    : "";

  const ticketHTML = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Print Ticket</title>
    <style>
      @media print {
        @page { margin: 10mm; size: A4 portrait; }  
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 13px;
        color: #333;
        line-height: 1.5;
        background: #fff;
        margin: 0;
        padding: 40px;
      }

      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; gap: 12px; }
      .header-left { display: flex; align-items: center; gap: 16px; }
      .agent-logo { height: 44px; max-width: 140px; object-fit: contain; }
      .brand { display: flex; align-items: center; gap: 12px; }
      .brand img { height: 40px; }
      .brand-text h1 { margin: 0; font-size: 20px; color: #8c8c8c; font-weight: bold; }
      .brand-text p { margin: 0; font-size: 11px; color: #b0b0b0; }
        
      .ref-box { text-align: right; }
      .ref-label { font-size: 15px; font-weight: bold; color: #8c8c8c; }
      .ref-value { font-size: 17px; font-weight: bold; color: #505050; margin-top: -2px; }

      .summary-row { display: grid; grid-template-columns: repeat(${3 + (showPNR ? 1 : 0) + (showPrice ? 1 : 0)}, 1fr); gap: 15px; margin-bottom: 30px; }
      .sum-card { 
        border: 1px solid #f0f0f0; 
        border-radius: 12px; 
        padding: 15px; 
        text-align: center; 
      }
      .sum-label { font-size: 10px; font-weight: bold; color: #b0b0b0; text-transform: uppercase; margin-bottom: 4px; }
      .sum-val { font-size: 15px; font-weight: bold; color: #333; }

      .section-title { 
        font-size: 12px; 
        font-weight: 800; 
        color: #333; 
        margin-bottom: 12px; 
        text-transform: uppercase;
        border-bottom: 1px solid black;
        padding-bottom: 5px;
      }

      table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
      th { 
        text-align: left; 
        font-size: 11px; 
        color: #b0b0b0; 
        font-weight: normal; 
        padding: 8px 0; 
        border-bottom: 1px solid black;
      }
      td { padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px; color: #444; }
      .bold-td { font-weight: bold; color: #000; }

      .info-block { margin-bottom: 20px; }
      .info-title { font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #333; }
      .info-row { font-size: 14px; margin-bottom: 6px; }
      .info-row span { font-weight: bold; }

      .imp-list { padding-left: 18px; margin: 5px 0; }
      .imp-list li { font-size: 12px; color: #555; margin-bottom: 4px; }

      .pill-address {
        display: inline-flex;
        align-items: center;
        border: 1px solid #8c8c8c;
        border-radius: 50px;
        padding: 5px 15px;
        margin-top: 15px;
        font-size: 11px;
        color: #8c8c8c;
        font-weight: bold;
        gap: 6px;
      }
      .pin { color: #e74c3c; font-size: 14px; }
    </style>
  </head>
  <body>
    <div style="max-width: 800px; margin: 0 auto;">
        
      <!-- Header -->
      <div class="header">
        <div class="header-left">
          <img class="agent-logo" src="${agentLogo}" alt="Agent Logo" />
          <div class="brand">
            <img src="${airlineLogo}" alt="Airline Logo" />
            <div class="brand-text">
              <h1>${airlineName}</h1>
              <p>Electronic Ticket / Itinerary Receipt</p>
            </div>
          </div>
        </div>
        ${
          showPNR
            ? `<div class="ref-box">
          <div class="ref-label">BOOKING REF</div>
          <div class="ref-value">${bookingRef}</div>
        </div>`
            : ""
        }
      </div>

      <!-- Summary Row -->
      <div class="summary-row">
        <div class="sum-card">
          <div class="sum-label">FLIGHT</div>
          <div class="sum-val">${airlineName} ${flightNum}</div>
        </div>
        ${pnrHTML}
        <div class="sum-card">
          <div class="sum-label">ROUTE</div>
          <div class="sum-val">${sector}</div>
        </div>
        <div class="sum-card">
          <div class="sum-label">STATUS</div>
          <div class="sum-val">${bookingStatus}</div>
        </div>
        ${priceHTML}
      </div>

      <!-- Flight Segments -->
      <div class="section-title">FLIGHT SEGMENTS</div>
      <table>
        <thead>
          <tr>
            <th style="color: #000; font-weight: bold; font-size: 13px;">Airline</th>
            <th style="color: #000; font-weight: bold; font-size: 13px;">Flight</th>
            <th style="color: #000; font-weight: bold; font-size: 13px;">Route</th>
            <th style="color: #000; font-weight: bold; font-size: 13px;">Departure Date</th>
            <th style="color: #000; font-weight: bold; font-size: 13px;">Departure Time</th>
            <th style="color: #000; font-weight: bold; font-size: 13px;">Arrival Time</th>
            ${showPNR ? "<th style=\"color: #000; font-weight: bold; font-size: 13px;\">PNR</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${segments
            .map(
              (seg) => `
          <tr>
            <td>${safeValue(seg.airline, airlineName)}</td>
            <td>${safeValue(seg.flightNo, flightNum)}</td>
            <td>${safeValue(seg.origin, originCode)} - ${safeValue(seg.destination, destCode)}</td>
            <td>${seg.depDate}</td>
            <td>${safeValue(seg.depTime, depTime)}</td>
            <td>${safeValue(seg.arrTime, arrTime)}</td>
            ${showPNR ? `<td>${pnr}</td>` : ""}
          </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <!-- Passenger(s) -->
      <div class="section-title">PASSENGER(S)</div>
      <table>
        <thead>
          <tr>
            <th style="width: 6%; color: #000; font-weight: bold; font-size: 13px;">No.</th>
            <th style="width: 30%; color: #000; font-weight: bold; font-size: 13px;">Name</th>
            <th style="color: #000; font-weight: bold; font-size: 13px;">Type</th>
            <th style="color: #000; font-weight: bold; font-size: 13px;">Passport</th>
            <th style="color: #000; font-weight: bold; font-size: 13px;">Nationality</th>
            ${showPrice ? '<th style="color: #000; font-weight: bold; font-size: 13px;">Fare</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${passengers
            .map(
              (p, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td class="bold-td">${p.title || ""} ${p.givenName || ""} ${p.surName || ""}</td>
              <td>${safeValue(p.type?.toLowerCase(), "adult")}</td>
              <td>${p.passport || "N/A"}</td>
              <td>${safeValue(p.nationality || "Pakistani")}</td>
              ${showPrice ? `<td>${getPassengerFare(p.type)}</td>` : ''}
            </tr>
          `,
            )
            .join("")}
          ${showPrice ? `
          <tr>
            <td colspan="5" class="bold-td">GRAND TOTAL</td>
            <td class="bold-td">PKR ${Number(grandTotal).toLocaleString()}</td>
          </tr>
          ` : ''}
        </tbody>
      </table>

      <!-- Issued By -->
      <div class="info-block">
        <div class="info-title">ISSUED BY</div>
        <div class="info-row">Agent Name: <span>${getName(booking)}</span></div>
        <div class="info-row">Contact Email: <span>${getAgencyEmail(booking)}</span></div>
        <div class="info-row">Phone: <span>${getAgencyPhone(booking)}</span></div>
      </div>

      <!-- Important -->
      <div class="info-block">
        <div class="info-title">IMPORTANT</div>
        <ul class="imp-list">
          <li>Arrive at the airport at least 4 hours before departure.</li>
          <li>Valid government photo ID is required.</li>
          <li>Baggage allowances may vary by airline and fare.</li>
        </ul>
      </div>

      <!-- Footer Address Pill -->
       <div class="pill-address">
            <span class="pin">📍</span>
            ${getAgencyAddress(booking)}
        </div>

    </div>
  </body>
  </html>
  `;

  // --- 4. Print using an IFrame (with null-safe contentWindow) ---
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(ticketHTML);
    iframeDoc.close();
  } else {
    // Fallback: clean up and exit if iframe document not available
    document.body.removeChild(iframe);
    console.error('Unable to access iframe document for printing.');
    return;
  }

  // When the iframe has loaded, trigger print
  iframe.onload = function() {
    const win = iframe.contentWindow;
    if (!win) {
      // If contentWindow is null, we cannot print; clean up
      cleanup();
      return;
    }
    // Small delay to let styles apply
    setTimeout(() => {
      win.focus();
      win.print();
    }, 300);
  };

  // Cleanup after printing
  const cleanup = () => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  // Fallback: if afterprint never fires, remove after 5 seconds
  setTimeout(cleanup, 5000);
};

// --- Helper Functions (unchanged) ---
const getStoredFrontendUser = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem("frontend_user") || "{}");
  } catch {
    return {};
  }
};

const getName = (booking: any): string => {
  const storedFrontendUser = getStoredFrontendUser();

  if (typeof booking.userId === "object" && booking.userId?.name) {
    return booking.userId.name;
  }
  if (booking.contactPersonName) {
    return booking.contactPersonName;
  }
  if (booking.issuedBy) {
    return booking.issuedBy;
  }
  if (storedFrontendUser.name) {
    return storedFrontendUser.name;
  }
  if (storedFrontendUser.companyName) {
    return storedFrontendUser.companyName;
  }
  return "SUPRA TRAVEL & TOURS";
};

const getAgencyEmail = (booking: any): string => {
  const storedFrontendUser = getStoredFrontendUser();

  if (typeof booking.userId === "object" && booking.userId?.email) {
    return booking.userId.email;
  }
  if (booking.email) {
    return booking.email;
  }
  if (booking.contactEmail) {
    return booking.contactEmail;
  }
  if (storedFrontendUser.email) {
    return storedFrontendUser.email;
  }
  return "N/A";
};

const getAgencyPhone = (booking: any): string => {
  const storedFrontendUser = getStoredFrontendUser();

  if (typeof booking.userId === "object" && booking.userId?.phone) {
    return booking.userId.phone;
  }
  if (booking.phone) {
    return booking.phone;
  }
  if (booking.contactPhone) {
    return booking.contactPhone;
  }
  if (booking.contactNumber) {
    return booking.contactNumber;
  }
  if (storedFrontendUser.phone) {
    return storedFrontendUser.phone;
  }
  return "N/A";
};

const getAgencyAddress = (booking: any): string => {
  const storedFrontendUser = getStoredFrontendUser();

  if (typeof booking.userId === "object" && booking.userId?.address) {
    return booking.userId.address;
  }
  if (booking.address) {
    return booking.address;
  }
  if (booking.contactAddress) {
    return booking.contactAddress;
  }
  if (storedFrontendUser.address) {
    return storedFrontendUser.address;
  }
  return "AL RASHEED PLAZA MAIN RAY ROAD PAKISTAN HOTEL";
};