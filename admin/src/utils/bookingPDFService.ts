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

  // --- 2. Data Preparation ---
  const flight = booking.flights?.[0] || {};

  // Booking Status
  const bookingStatusRaw = booking.status || booking.bookingStatus || "N/A";
  const bookingStatus = bookingStatusRaw.toUpperCase();

  const airlineName = (
    booking.airline?.name ||
    flight.airlineName ||
    "AIRLINE"
  ).toUpperCase();

  // const agencyLogo = "assets/images/logo.webp";
  const airlineLogo = booking.airline?.logoUrl || flight.airlineLogo || "";

  const pnr = booking.pnr || booking.bookingReference || "N/A";
  const bookingRef = booking.bookingReference || pnr;

  const flightNum = booking.flightNumber || flight.flightNo || "XX000";

  // const origin = (
  //   booking.origin ||
  //   booking.originCity ||
  //   flight.origin ||
  //   ""
  // ).toUpperCase();

  let originCode = (
    booking.originCode ||
    flight.originCode ||
    booking.originIata ||
    flight.sectorFrom ||
    ""
  ).toUpperCase();

  // const dest = (
  //   booking.destination ||
  //   booking.destinationCity ||
  //   flight.destination ||
  //   ""
  // ).toUpperCase();

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

  const sector = `${originCode} - ${destCode}`;

  const passengers: any[] =
    booking.passengers && booking.passengers.length > 0
      ? booking.passengers
      : [
          {
            title: booking.passengers?.[0]?.title || "",
            givenName: booking.passengers?.[0]?.givenName || "PASSENGER",
            surName: booking.passengers?.[0]?.surName || "NAME",
            passport: "N/A",
          },
        ];

  // const storedFrontendUser = (() => {
  //   try {
  //     return JSON.parse(localStorage.getItem("frontend_user") || "{}");
  //   } catch (e) {
  //     return {};
  //   }
  // })();

  // --- 3. Construct the HTML String (PDF Design -> Black & White) ---
  // Only show PNR if booking status does not contain 'HOLD' (case-insensitive)
  const showPNR = !/hold/i.test(bookingStatusRaw);

  const priceAmount = booking.pricing?.grandTotal || booking.price || booking.amount || 0;
  const priceHTML = showPrice
    ? `<div class="sum-card">
      <div class="sum-label">PRICE (PKR)</div>
      <div class="sum-val">PKR ${Number(priceAmount).toLocaleString()}</div>
    </div>`
    : "";

  // Only render PNR box if not HOLD
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

      /* 1. Header Section */
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
      .brand { display: flex; align-items: center; gap: 12px; }
      .brand img { height: 40px; }
      .brand-text h1 { margin: 0; font-size: 20px; color: #8c8c8c; font-weight: bold; }
      .brand-text p { margin: 0; font-size: 11px; color: #b0b0b0; }
        
      .ref-box { text-align: right; }
      .ref-label { font-size: 15px; font-weight: bold; color: #8c8c8c; }
      .ref-value { font-size: 17px; font-weight: bold; color: #505050; margin-top: -2px; }

      /* 2. Top Summary Boxes */
      .summary-row { display: grid; grid-template-columns: repeat(${3 + (showPNR ? 1 : 0) + (showPrice ? 1 : 0)}, 1fr); gap: 15px; margin-bottom: 30px; }
      .sum-card { 
        border: 1px solid #f0f0f0; 
        border-radius: 12px; 
        padding: 15px; 
        text-align: center; 
      }
      .sum-label { font-size: 10px; font-weight: bold; color: #b0b0b0; text-transform: uppercase; margin-bottom: 4px; }
      .sum-val { font-size: 15px; font-weight: bold; color: #333; }

      /* 3. Section Styling */
      .section-title { 
        font-size: 12px; 
        font-weight: 800; 
        color: #333; 
        margin-bottom: 12px; 
        text-transform: uppercase;
        border-bottom: 1px solid black;
        padding-bottom: 5px;
      }

      /* 4. Table Design (Clean - No Vertical Lines) */
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

      /* 5. Details Section */
      .info-block { margin-bottom: 20px; }
      .info-title { font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #333; }
      .info-row { font-size: 14px; margin-bottom: 6px; }
      .info-row span { font-weight: bold; }

      /* Important list dots */
      .imp-list { padding-left: 18px; margin: 5px 0; }
      .imp-list li { font-size: 12px; color: #555; margin-bottom: 4px; }

      /* 6. Location Pill at Bottom */
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
        <div class="brand">
          <img src="${airlineLogo}" alt="Airline Logo" />
          <div class="brand-text">
            <h1>${airlineName}</h1>
            <p>Electronic Ticket / Itinerary Receipt</p>
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
            <th>Airline</th>
            <th>Flight</th>
            <th>Route</th>
            <th>Departure Date</th>
            <th>Departure Time</th>
            <th>Arrival Time</th>
            ${showPNR ? "<th>PNR</th>" : ""}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${airlineName}</td>
            <td>${flightNum}</td>
            <td>${sector.split("-").slice(0, 2).join("-")}</td>
            <td>${depDate}</td>
            <td>${depTime}</td>
            <td>${arrTime}</td>
            ${showPNR ? `<td>${pnr}</td>` : ""}
          </tr>
        </tbody>
      </table>

      <!-- Passenger(s) -->
      <div class="section-title">PASSENGER(S)</div>
      <table>
        <thead>
          <tr>
            <th style="width: 40%;">Name</th>
            <th>Type</th>
            <th>Passport</th>
            <th>Nationality</th>
          </tr>
        </thead>
        <tbody>
          ${passengers
            .map(
              (p) => `
            <tr>
              <td class="bold-td">${p.title || ""} ${p.givenName || ""} ${p.surName || ""}</td>
              <td>adult</td>
              <td>${p.passport || "N/A"}</td>
              <td>Pakistani</td>
            </tr>
          `,
            )
            .join("")}
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

  // ...existing code...
  // --- 4. The Iframe Trick ---
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(ticketHTML);
    iframeDoc.close();
  }

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Print failed", e);
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }
  };
};

// --- Helper Functions ---
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
