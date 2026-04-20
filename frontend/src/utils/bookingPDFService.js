export const printGDSBooking = (booking) => {
    // --- 1. Helper Functions ---
    const formatFullDate = (dateStr) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    // --- 2. Data Preparation (Preserving your logic + adding PDF specific helpers) ---
    const flight = booking.flights?.[0] || {};

    // Airline & Logos
    const airlineName = (
        booking.airline?.name ||
        flight.airlineName ||
        "AIRLINE"
    ).toUpperCase();
    // Note: Ensure this path is accessible from the browser window, or use a Base64 string if possible
    const agencyLogo = "/src/assets/images/logo.webp";
    const airlineLogo = booking.airline?.logoUrl || flight.airlineLogo || "";

    // Booking Refs
    const pnr = booking.pnr || booking.bookingReference || "N/A";
    const bookingRef = booking.bookingReference || pnr;

    // Flight Details
    const flightNum = booking.flightNumber || flight.flightNo || "XX000";
    // Location Logic
    const origin = (
        booking.origin ||
        booking.originCity ||
        flight.origin ||
        ""
    ).toUpperCase();

    // Try multiple sources for IATA / airport codes (flight, booking, sector fields)
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

    // If still missing, try parsing from booking.sector (e.g. "ISB-AUH")
    if ((!originCode || !originCode.trim() || originCode === "") && booking.sector) {
        const sectorMatch = booking.sector.match(/([A-Z]{3})-([A-Z]{3})/);
        if (sectorMatch) originCode = sectorMatch[1];
    }
    if ((!destCode || !destCode.trim() || destCode === "") && booking.sector) {
        const sectorMatch = booking.sector.match(/([A-Z]{3})-([A-Z]{3})/);
        if (sectorMatch) destCode = sectorMatch[2];
    }

    // Final fallback to show 'N/A' instead of a static hard-coded IATA
    originCode = originCode || "N/A";
    destCode = destCode || "N/A";

    // Time Logic
    const depTime = flight.depTime || booking.depTime || "00:00";
    const arrTime = flight.arrTime || booking.arrTime || "00:00";
    const depDate = formatFullDate(booking.departureDate);
    const arrDate = formatFullDate(booking.arrivalDate || booking.departureDate);

    // Baggage & Sector
    const baggage = booking.baggageWeight || flight.baggage || "20KG";
    const sector = `${origin} (${originCode}) - ${dest} (${destCode})`;

    // Plane Icon (Base64 from your PDF code)
    const planeIconBase64 =
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzAwMCIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBzdHlsZT0idHJhbnNmb3JtOiByb3RhdGUoOTBkZWcpOyI+PHBhdGggZD0iTTIxIDE2di0ybC04LTVWMy41YzAtLjgzLS42Ny0xLjUtMS41LTEuNVMxMCAyLjY3IDEwIDMuNVY5TDIgMTR2Mmw4LTIuNVYxOWwtMiAxLjVWMjJsMy41LTEgMy41IDF2LTEuNUwxMyAxOXYtNS41bDggMi41eiIvPjwvc3ZnPg==";

    // Passengers (Logic adapted to handle array like the PDF, defaulting to your single passenger extract if needed)
    const passengers =
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

    // Frontend user fallback (safe parse)
    const storedFrontendUser = (() => {
        try {
            return JSON.parse(localStorage.getItem("frontend_user") || "{}");
        } catch (e) {
            return {};
        }
    })();

    // Dynamic fields (never static)
    const issuedBy =
        booking.issuedBy ||
        storedFrontendUser.companyName ||
        storedFrontendUser.name ||
        "N/A";

    const agencyName =
        (booking.userId && booking.userId.companyName) ||
        booking.agencyName ||
        storedFrontendUser.companyName ||
        "N/A";

    const phoneNumber =
        (booking.userId && booking.userId.phone) ||
        booking.phone ||
        storedFrontendUser.phone ||
        "N/A";

    // --- 3. Construct the HTML String (PDF Design -> Black & White) ---
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
                /* Utilities */
                .flex-row { display: flex; justify-content: space-between; align-items: center; }
                .text-upper { text-transform: uppercase; }
                .text-bold { font-weight: bold; }
                .text-center { text-align: center; }
                .mb-10 { margin-bottom: 10px; }
                .mb-20 { margin-bottom: 20px; }
                
                /* Layout Components */
                .header-imgs img { max-height: 120px; object-fit: contain; }
                
                .main-title {
                    font-size: 24px;
                    font-weight: 400;
                    margin: 20px 0;
                    border-bottom: 2px solid #000;
                    padding-bottom: 10px;
                }

                /* Info Box (Was Blue -> Now Black Border) */     
                .info-box {
                    border: 2px solid #000;
                    padding: 15px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                }
                .info-col { display: flex; flex-direction: column; align-items: flex-start; }
                .info-col.right { align-items: flex-end; text-align: right; }
                .info-col.labels .info-label { margin-bottom: 12px; font-size: 16px; font-weight: 600; color: #333; }
                .info-col.values .info-val.small { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
                .info-col.values .info-val.large { font-size: 18px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
                .info-label { font-size: 12px; color: #333; }
                .info-val { font-size: 16px; font-weight: bold; margin-top: 2px; }

                /* Strip (Was Orange -> Now Black Background) */
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

                /* Flight Details */ 
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
                
                /* Plane Icon Position */
                .plane-icon {
                    position: absolute;
                    left: 56%;
                    top: 15px;
                    opacity: 0.5;
                }

                /* Passenger Table */
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { 
                    background-color: #eee; 
                    color: #000; 
                    padding: 8px; 
                    text-align: left; 
                    font-weight: bold; 
                    border: 2px solid #000;
                }
                td { 
                    padding: 8px; 
                    border: 2px solid #000; 
                    font-size: 13px;
                }

                /* Footer */
                .terms { font-size: 11px; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; }
                .footer-note { margin-top: 20px; font-size: 10px; text-align: center; color: #555; }
            </style>
        </head>
        <body>
            <div style="max-width: 800px; margin: 0 auto;">
                
                <!-- 1. Header Section -->
                <div class="flex-row header-imgs">
                    <!-- Agency Logo -->
                    <div>
                         <img src="${agencyLogo}" alt="Agency" />
                    </div>
                    <!-- Airline Logo -->
                    <div>
                        <img src="${airlineLogo}" alt="${airlineName}" onerror="this.style.display='none'" />
                    </div>
                </div>

                <div class="main-title">Electronic Ticket Reservation</div>

                <!-- 2. Booking Info Box (Monochrome) -->
                <div class="info-box">
                    <div class="flex-row">
                        <div class="info-col labels">
                            <div class="info-label">Booking Reference Number (PNR)</div>
                            <div class="info-label">Booking ID</div>
                            <div class="info-label">Issued By</div>
                            <div class="info-label">Agent Name</div>
                            <div class="info-label">Phone Number</div>
                        </div>
                        <div class="info-col values left">
                            <div class="info-val small">${pnr}</div>
                            <div class="info-val large">${bookingRef}</div>
                            <div class="info-val small">${getAgencyName(booking)}</div>
                            <div class="info-val small">${getName(booking)}</div>
                            <div class="info-val small">+92 347 8885551</div>
                        </div>
                    </div>
                </div>

                <!-- 3. Flight Strip (Black Header) -->
                <div class="flight-strip">
                    Flight - ${sector}
                </div>

                <!-- 4. Flight Details Section -->
                <div class="flight-details">
                    <div class="detail-row">
                        <!-- Col 1: Airline -->
                        <div class="col-1">
                            <div class="col-header">AIRLINE</div>
                            <div class="col-content text-upper">${airlineName}</div>
                        </div>

                        <!-- Col 2: Flight & Baggage -->
                        <div class="col-2">
                            <div class="col-header">FLIGHT #</div>
                            <div class="col-content mb-20">${flightNum}</div>
                            
                            <div class="col-header" style="margin-bottom: 2px;">BAGGAGE</div>
                            <div class="col-content">${baggage}</div>
                        </div>

                        <!-- Col 3: Departure -->
                        <div class="col-3">
                            <div class="col-header">DEPARTURE</div>
                            <div class="col-content mb-10" style="font-size: 18px;">${depTime}</div>
                            <div class="col-content text-upper text-bold">${origin}</div>
                            <div class="col-content">${depDate}</div>
                        </div>

                        <!-- Icon -->
                        <div class="plane-icon">
                            <img src="${planeIconBase64}" width="32" height="32" />
                        </div>

                        <!-- Col 4: Arrival -->
                        <div class="col-4">
                            <div class="col-header">ARRIVAL</div>
                            <div class="col-content mb-10" style="font-size: 18px;">${arrTime}</div>
                            <div class="col-content text-upper text-bold">${dest}</div>
                            <div class="col-content">${arrDate}</div>
                        </div>
                    </div>
                </div>

                <!-- 5. Passenger Table -->
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
                                <td class="text-upper text-bold">
                                    ${p.title || ""} ${p.givenName || ""} ${p.surName || ""}
                                </td>
                                <td>${p.passport || "N/A"}</td>
                                <td>YES</td>
                            </tr>
                        `,
            )
            .join("")}
                    </tbody>
                </table>

                <!-- 6. Terms & Footer -->
                <div 
  style="line-height: 2; font-family: Arial, sans-serif; font-size: 13px;" 
  class="terms"
>
  <div style="font-weight:bold;> class="mb-10">TERMS & CONDITIONS</div>

  <div style="font-weight:bold; font-size: 12px;"><span style="margin-right:8px;">1-</span>PLEASE CROSS CHECK NAME AND FLIGHT DETAILS.</div>
  <div style="font-weight:bold;  font-size: 12px"><span style="margin-right:8px;">2-</span>PLEASE REPORT AIRLINE CHECK-IN COUNTER 4 HOURS BEFORE FLIGHT DEPARTURE.</div>
  <div style="font-weight:bold;  font-size: 12px"><span style="margin-right:8px;">3-</span>PLEASE RECONFIRM THE TICKET BEFORE 48 HOURS OF FLIGHT DEPARTURE.</div>
  <div style="font-weight:bold;  font-size: 12px"><span style="margin-right:8px;">4-</span>ALL VISA AND TRAVEL DOCUMENT ARE TRAVELER OWN RESPONSIBILITY.</div>
  <div style="font-weight:bold;  font-size: 12px"><span style="margin-right:8px;">5-</span>TICKETS ARE NON-REFUNDABLE AND NON-CHANGEABLE ANY TIME.</div>
</div>




 
                <div class="footer-note">
                    GENERATED BY SYSTEM | ${new Date().toLocaleString()}
                </div>

            </div>
        </body>
        </html>
    `;

    // --- 4. The Iframe Trick ---
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(ticketHTML);
    doc.close();

    iframe.onload = () => {
        try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } catch (e) {
            console.error("Print failed", e);
        } finally {
            // Remove iframe after delay
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }
    };
};




const getAgencyName = (booking) => {
  if (typeof booking.userId === "object" && booking.userId?.companyName) {
    return booking.userId.companyName;
  }
  return "SUPRA TRAVEL & TOURS";
};


const getName = (booking) => {
  if (typeof booking.userId === "object" && booking.userId?.name) {
    return booking.userId.name;
  }
  return "SUPRA TRAVEL & TOURS";
};