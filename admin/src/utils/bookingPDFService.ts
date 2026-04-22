export const printGDSBooking = (booking: any): void => {
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

  const origin = (
    booking.origin ||
    booking.originCity ||
    flight.origin ||
    ""
  ).toUpperCase();

  let originCode = (
    booking.originCode ||
    flight.originCode ||
    booking.originIata ||
    flight.sectorFrom ||
    ""
  ).toUpperCase();

  const dest = (
    booking.destination ||
    booking.destinationCity ||
    flight.destination ||
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

  const sector = `${origin} (${originCode}) - ${dest} (${destCode})`;

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

  const storedFrontendUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("frontend_user") || "{}");
    } catch (e) {
      return {};
    }
  })();

  console.log(storedFrontendUser);

  // --- 3. Construct the HTML String ---
  // Note: Fixed the broken <div> tag in Terms & Conditions below
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
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    font-size: 13px;
                    color: #333;
                    line-height: 1.6;
                    background: #fff;
                    margin: 0;
                    padding: 40px;
                }
                /* Header Styles */
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
                .airline-info { display: flex; align-items: center; gap: 15px; }
                .airline-info img { height: 45px; }
                .airline-text h1 { margin: 0; font-size: 22px; color: #888; font-weight: bold; line-height: 1; }
                .airline-text p { margin: 0; font-size: 12px; color: #bbb; }
                
                .booking-ref { text-align: right; }
                .ref-label { font-size: 14px; font-weight: bold; color: #888; margin-bottom: 2px; }
                .ref-value { font-size: 26px; font-weight: bold; color: #555; }

                /* Summary Boxes */
                .summary-container { display: grid; grid-template-columns: 1fr 1.2fr 1.2fr; gap: 15px; margin-bottom: 30px; }
                .sum-box { 
                    border: 1px solid #eee; 
                    border-radius: 12px; 
                    padding: 15px 10px; 
                    text-align: center; 
                    background: #fff;
                }
                .sum-label { font-size: 11px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 5px; }
                .sum-val { font-size: 16px; font-weight: 800; color: #333; }

                /* Sections */
                .section-title { 
                    font-size: 13px; 
                    font-weight: 800; 
                    color: #333; 
                    margin-bottom: 12px; 
                    text-transform: uppercase;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 5px;
                }

                /* Table Styling */
                table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
                th { 
                    text-align: left; 
                    font-size: 11px; 
                    color: #bbb; 
                    font-weight: 600; 
                    padding: 8px 0; 
                    border-bottom: 1px solid #eee;
                }
                td { padding: 12px 0; border-bottom: 1px solid #eee; font-size: 12px; color: #555; }
                .bold-cell { font-weight: bold; color: #000; }

                /* Footer Info */
                .info-group { margin-bottom: 20px; }
                .info-header { font-weight: 800; color: #333; margin-bottom: 10px; font-size: 13px; }
                .info-item { font-size: 14px; color: #444; margin-bottom: 5px; }
                .info-item span { font-weight: 600; }

                /* Important List */
                .important-list { padding-left: 18px; margin: 10px 0; }
                .important-list li { font-size: 12px; color: #555; margin-bottom: 4px; }

                /* Location Pill */
                .location-pill {
                    display: inline-flex;
                    align-items: center;
                    border: 1px solid #888;
                    border-radius: 50px;
                    padding: 6px 18px;
                    margin-top: 15px;
                    font-size: 11px;
                    color: #888;
                    text-transform: uppercase;
                    font-weight: 600;
                    gap: 8px;
                }
                .location-pin { color: #e74c3c; font-size: 14px; }
            </style>
        </head>
        <body>
            <!-- Header Row -->
            <div class="header">
                <div class="airline-info">
                    <img src="${airlineLogo}" alt="saudia" />
                    <div class="airline-text">
                        <h1>saudiair</h1>
                        <p>Electronic Ticket / Itinerary Receipt</p>
                    </div>
                </div>
                <div class="booking-ref">
                    <div class="ref-label">BOOKING REF</div>
                    <div class="ref-value">${bookingRef}</div>
                </div>
            </div>

            <!-- Top Summary Boxes -->
            <div class="summary-container">
                <div class="sum-box">
                    <div class="sum-label">FLIGHT</div>
                    <div class="sum-val">${airlineName} ${flightNum}</div>
                </div>
                <div class="sum-box">
                    <div class="sum-label">PNR</div>
                    <div class="sum-val">${pnr}</div>
                </div>
                <div class="sum-box">
                    <div class="sum-label">ROUTE</div>
                    <div class="sum-val">${sector}</div>
                </div>
            </div>

            <!-- Flight Segments Section -->
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
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${airlineName}</td>
                        <td>${flightNum}</td>
                        <td>${sector.split('-').slice(0,2).join('-')}</td>
                        <td>${depDate}</td>
                        <td>${depTime}</td>
                        <td>${arrTime}</td>
                    </tr>
                    <!-- Additional segments can go here -->
                </tbody>
            </table>

            <!-- Passengers Section -->
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
                    ${passengers.map(p => `
                        <tr>
                            <td class="bold-cell">${p.title || ""} ${p.givenName || ""} ${p.surName || ""}</td>
                            <td>adult</td>
                            <td>${p.passport || "N/A"}</td>
                            <td>Pakistani</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <!-- Issued By Section -->
            <div class="info-group">
                <div class="info-header">ISSUED BY</div>
                <div class="info-item">Agent Name: <span>${getName(booking)}</span></div>
                <div class="info-item">Contact Email: <span>${getAgencyEmail(booking)}</span></div>
                <div class="info-item">Phone: <span>${getAgencyPhone(booking)}</span></div>
            </div>

            <!-- Important Section -->
            <div class="info-group">
                <div class="info-header">IMPORTANT</div>
                <ul class="important-list">
                    <li>Arrive at the airport at least 4 hours before departure.</li>
                    <li>Valid government photo ID is required.</li>
                    <li>Baggage allowances may vary by airline and fare.</li>
                </ul>
            </div>

            <!-- Location Pill -->
            <div class="location-pill">
                <span class="location-pin">📍</span>
                AL RASHEED PLAZA MAIN RAY ROAD PAKISTAN HOTEL
            </div>
        </body>
        </html>
    `;
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
