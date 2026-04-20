import agencyLogo from "../assets/images/logo.webp";
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
  const arrDate = formatFullDate(booking.arrivalDate || booking.departureDate);

  const baggage = booking.baggageWeight || flight.baggage || "20KG";
  const sector = `${origin} (${originCode}) - ${dest} (${destCode})`;

  const planeIconBase64 =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzAwMCIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBzdHlsZT0idHJhbnNmb3JtOiByb3RhdGUoOTBkZWcpOyI+PHBhdGggZD0iTTIxIDE2di0ybC04LTVWMy41YzAtLjgzLS42Ny0xLjUtMS41LTEuNVMxMCAyLjY3IDEwIDMuNVY5TDIgMTR2Mmw4LTIuNVYxOWwtMiAxLjVWMjJsMy41LTEgMy41IDF2LTEuNUwxMyAxOXYtNS41bDggMi41eiIvPjwvc3ZnPg==";

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
                    font-family: 'Helvetica', 'Arial', sans-serif;
                    font-size: 14px;
                    color: #000;
                    line-height: 1.4;
                    background: #fff;
                    margin: 0;
                    padding: 20px;
                }
                .flex-row { display: flex; justify-content: space-between; align-items: center; }
                .text-upper { text-transform: uppercase; }
                .text-bold { font-weight: bold; }
                .text-center { text-align: center; }
                .mb-10 { margin-bottom: 10px; }
                .mb-20 { margin-bottom: 20px; }
                .header-imgs img { max-height: 120px; object-fit: contain; }
                .main-title {
                    font-size: 24px;
                    font-weight: 400;
                    margin: 20px 0;
                    border-bottom: 2px solid #000;
                    padding-bottom: 10px;
                }
                .info-box {
                    border: 2px solid #000;
                    padding: 15px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                }
                .info-col { display: flex; flex-direction: column; align-items: flex-start; }
                .info-label { font-size: 12px; color: #333; margin-bottom: 5px; }
                .info-val { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
                .flight-strip {
                    background-color: #000;
                    color: #fff;
                    padding: 10px 15px;
                    font-weight: bold;
                    font-size: 16px;
                    border: 2px solid #000;
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                    margin-top: 20px;
                }
                .flight-details {
                    border: 2px solid #000;
                    border-top: none;
                    padding: 20px 10px;
                    margin-bottom: 30px;
                    position: relative;
                }
                .col-header { font-weight: bold; font-size: 13px; margin-bottom: 10px; text-decoration: underline; }
                .col-content { font-size: 15px; }
                .detail-row { display: flex; justify-content: space-between; position: relative; }
                .col-1 { width: 18%; }
                .col-2 { width: 20%; }
                .col-3 { width: 31%; }
                .col-4 { width: 31%; }
                .plane-icon { position: absolute; left: 56%; top: 15px; opacity: 0.5; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background-color: #eee; color: #000; padding: 8px; text-align: left; font-weight: bold; border: 2px solid #000; }
                td { padding: 8px; border: 2px solid #000; font-size: 13px; }
                .terms { font-size: 11px; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; }
                .footer-note { margin-top: 20px; font-size: 10px; text-align: center; color: #555; }
            </style>
        </head>
        <body>
            <div style="max-width: 800px; margin: 0 auto;">
                <div class="flex-row header-imgs">
                    <div><img src="${agencyLogo}" alt="Agency" /></div>
                    <div><img src="${airlineLogo}" alt="${airlineName}" onerror="this.style.display='none'" /></div>
                </div>

                <div class="main-title">Electronic Ticket Reservation</div>

                <div class="info-box">
                    <div class="flex-row">
                        <div class="info-col">
                            <div class="info-label">Booking Reference Number (PNR)</div>
                            <div class="info-val">${pnr}</div>
                            <div class="info-label">Booking ID</div>
                            <div class="info-val">${bookingRef}</div>
                        </div>
                        <div class="info-col" style="text-align: right; align-items: flex-end;">
                            <div class="info-label">Issued By</div>
                            <div class="info-val">${getAgencyName(booking)}</div>
                            <div class="info-label">Agent Name</div>
                            <div class="info-val">${getName(booking)}</div>
                        </div>
                    </div>
                </div>

                <div class="flight-strip">Flight - ${sector}</div>
                <div class="flight-details">
                    <div class="detail-row">
                        <div class="col-1">
                            <div class="col-header">AIRLINE</div>
                            <div class="col-content text-upper">${airlineName}</div>
                        </div>
                        <div class="col-2">
                            <div class="col-header">FLIGHT #</div>
                            <div class="col-content mb-20">${flightNum}</div>
                            <div class="col-header">BAGGAGE</div>
                            <div class="col-content">${baggage}</div>
                        </div>
                        <div class="col-3">
                            <div class="col-header">DEPARTURE</div>
                            <div class="col-content mb-10" style="font-size: 18px;">${depTime}</div>
                            <div class="col-content text-upper text-bold">${origin}</div>
                            <div class="col-content">${depDate}</div>
                        </div>
                        <div class="plane-icon"><img src="${planeIconBase64}" width="32" height="32" /></div>
                        <div class="col-4">
                            <div class="col-header">ARRIVAL</div>
                            <div class="col-content mb-10" style="font-size: 18px;">${arrTime}</div>
                            <div class="col-content text-upper text-bold">${dest}</div>
                            <div class="col-content">${arrDate}</div>
                        </div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">Sr #</th>
                            <th>Passenger Name</th>
                            <th>Passport #</th>
                            <th>Meal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${passengers
                          .map(
                            (p, idx) => `
                            <tr>
                                <td class="text-center">${idx + 1}</td>
                                <td class="text-upper text-bold">${p.title || ""} ${p.givenName || ""} ${p.surName || ""}</td>
                                <td>${p.passport || "N/A"}</td>
                                <td>YES</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>

                <div class="terms" style="line-height: 2;">
                    <div style="font-weight:bold; margin-bottom: 10px;">TERMS & CONDITIONS</div>
                    <div style="font-weight:bold; font-size: 12px;">1- PLEASE CROSS CHECK NAME AND FLIGHT DETAILS.</div>
                    <div style="font-weight:bold; font-size: 12px;">2- PLEASE REPORT AIRLINE CHECK-IN COUNTER 4 HOURS BEFORE FLIGHT DEPARTURE.</div>
                    <div style="font-weight:bold; font-size: 12px;">3- PLEASE RECONFIRM THE TICKET BEFORE 48 HOURS OF FLIGHT DEPARTURE.</div>
                    <div style="font-weight:bold; font-size: 12px;">4- ALL VISA AND TRAVEL DOCUMENT ARE TRAVELER OWN RESPONSIBILITY.</div>
                    <div style="font-weight:bold; font-size: 12px;">5- TICKETS ARE NON-REFUNDABLE AND NON-CHANGEABLE ANY TIME.</div>
                </div>

                <div class="footer-note">GENERATED BY SYSTEM | ${new Date().toLocaleString()}</div>
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
const getAgencyName = (booking: any): string => {
  if (typeof booking.userId === "object" && booking.userId?.companyName) {
    return booking.userId.companyName;
  }
  return "SUPRA TRAVEL & TOURS";
};

const getName = (booking: any): string => {
  if (typeof booking.userId === "object" && booking.userId?.name) {
    return booking.userId.name;
  }
  return "SUPRA TRAVEL & TOURS";
};
