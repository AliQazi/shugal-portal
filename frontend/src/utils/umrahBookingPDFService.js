import companyLogo from '../assets/images/logo2-.png';
import umrahPrintBg from '../assets/images/umrahbgprint.png';

export const printUmrahPackageBooking = (booking) => {
    const safeValue = (value, fallback = "N/A") =>
        value !== undefined && value !== null && value !== "" ? String(value) : fallback;

    const formatPrintDate = (value) => {
        if (!value) return "N/A";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "N/A";
        return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
    };

    const formatPrintTime = (value) => {
        if (!value) return "N/A";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "N/A";
        return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
    };

    const getAgencyName = (booking) => {
        if (typeof booking.userId === "object" && booking.userId?.companyName) return booking.userId.companyName;
        if (typeof booking.user === "object" && booking.user?.companyName) return booking.user.companyName;
        if (typeof booking.user === "object" && booking.user?.name) return booking.user.name;
        if (booking.agencyName) return booking.agencyName;
        if (booking.contactPersonName) return booking.contactPersonName;
        return "SHAHEEN WINGS TRAVELS";
    };

    const getAgencyPhone = (booking) => {
        if (booking.shaheenWingsContact?.phone) return booking.shaheenWingsContact.phone;
        if (booking.shaheenWingsPhone) return booking.shaheenWingsPhone;
        if (booking.adminPhone) return booking.adminPhone;
        return "N/A";
    };

    const packageData = booking.packageData || {};

    const getHotelIcon = (hotel) => {
        const city = String(hotel.city || hotel.cityName || hotel.location || hotel.hotelCity || "").toLowerCase();
        if (city.includes("makkah") || city.includes("mecca")) {
            return "https://www.mtctutorials.com/wp-content/uploads/2022/06/Kaaba-High-Quality-PNG-Image-1.png";
        }
        if (city.includes("madin") || city.includes("medina")) {
            return "https://png.pngtree.com/png-clipart/20220616/original/pngtree-prophet-mohammad-madina-or-madinah-nabawi-mosque-masjid-milad-un-nabi-png-image_8081426.png";
        }
        return "";
    };

    const getHotelsArray = (hotelsValue) => {
        if (Array.isArray(hotelsValue)) return hotelsValue.filter(Boolean);
        if (hotelsValue && typeof hotelsValue === "object") return Object.values(hotelsValue).filter(Boolean);
        return [];
    };

    const getHotelName = (hotel) => {
        if (!hotel) return "";
        if (typeof hotel === "string") return hotel;
        if (typeof hotel.hotel === "object") {
            return hotel.hotelName || hotel.hotel.name || hotel.hotel.title || "";
        }
        return hotel.hotelName || hotel.name || hotel.title || hotel.hotel || "";
    };

    // Logic for hotels
    const hotels = getHotelsArray(packageData.hotels);
    const hotelDisplay = hotels.length > 0
        ? hotels.map((h) => {
            const icon = getHotelIcon(h);
            return `<div style="display:flex;align-items:center;gap:6px;">${icon ? `<img src="${icon}" alt="hotel icon" style="width:18px;height:18px;object-fit:contain;" />` : ""}<span>${safeValue(getHotelName(h), "HOTEL")}</span></div>`;
        }).join('')
        : `<div>${safeValue(getHotelName(packageData.hotel) || packageData.hotelName, "HOTEL")}</div>`;

    const duration = safeValue(packageData.packageDuration || packageData.duration || packageData.packageDays || packageData.days, "N/A");
    const roomType = safeValue(booking.roomType || packageData.roomType, "SHARING");
    const transport = safeValue(
        Array.isArray(packageData.transports) && packageData.transports.length
            ? packageData.transports.map((t) => t.transportType || t.type || t.route).filter(Boolean).join(", ")
            : packageData.transport || booking.transport,
        "SHARING",
    );

    const ticketNumber = safeValue(booking.bookingNumber || booking._id || booking.bookingReference, "N/A");
    const bookingReference = safeValue(booking.bookingReference || booking.bookingNumber || booking._id, "N/A");
    const issuedOn = new Date(booking.createdAt || Date.now());

    const bookedBy = "SHAHEEN WINGS TRAVELS";
    const contact = "03099802154";
    const statusText = safeValue(booking.status?.toUpperCase() || "HOLD", "HOLD");

    const passengers = Array.isArray(booking.passengers) && booking.passengers.length ? booking.passengers : [
        { title: "MR", givenName: "N/A", surName: "N/A", passport: "N/A" },
    ];

    const itinerary = Array.isArray(packageData.flights) && packageData.flights.length
        ? packageData.flights
        : Array.isArray(booking.flights) && booking.flights.length
            ? booking.flights
            : [];
    const flight = itinerary[0] || {};
    const pnr = safeValue(booking.pnr || packageData.pnr || flight.pnr, "N/A");
    const showPNR = /confirmed/i.test(booking.status || booking.bookingStatus || "");

    // Use the booking agent's own uploaded logo when available, otherwise
    // fall back to the default Shaheen Wings logo.
    const agentLogo =
        (typeof booking.user === "object" && booking.user?.logo) ||
        (typeof booking.userId === "object" && booking.userId?.logo) ||
        "";
    const companyLogoUrl = agentLogo || companyLogo;
    const umrahPrintBgUrl = umrahPrintBg;
    const airlineName = safeValue(
        booking.airline?.name || packageData.airline?.name || booking.airlineName || "AIRLINE",
        "AIRLINE",
    ).toUpperCase();

    const airlineLogos = Array.from(
        new Set([
            booking.airline?.logoUrl,
            booking.airline?.logo_url,
            booking.airline?.logo,
            booking.airlineLogo,
            booking.airline_logo,
            packageData.airlineLogo,
            packageData.airline?.logoUrl,
            packageData.airline?.logo_url,
            packageData.airline?.logo,
            flight.airline?.logoUrl,
            flight.airline?.logo_url,
            flight.airline?.logo,
            flight.airlineLogo,
            flight.airline_logo,
            flight.logoUrl,
            flight.logo_url,
            flight.logo,
            ...itinerary.flatMap((seg) => [
                seg.airlineLogo,
                seg.airlineLogoUrl,
                seg.airline?.logoUrl,
                seg.airline?.logo_url,
                seg.airline?.logo,
                seg.logoUrl,
                seg.logo_url,
                seg.airline_logo,
                seg.logo,
            ]),
        ].filter(Boolean)),
    );

    const airlineLogoHTML = airlineLogos.length
        ? airlineLogos.map((url) => `<img class="airline-logo" src="${url}" alt="Airline Logo" />`).join("")
        : `<div class="airline-name">${airlineName}</div>`;

    const ticketHTML = `<!DOCTYPE html>
<html>
<head>
    <style>
        @media print {
            @page { margin: 0.5cm; size: A4; }
            body { -webkit-print-color-adjust: exact; }
        }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #333; margin: 0; padding: 20px; line-height: 1.4; }
        .container { width: 100%; max-width: 800px; margin: 0 auto; border: 1px solid #eee; padding: 20px; }
        
        /* Header Section */
        .header { display: grid; grid-template-columns: 1fr minmax(220px, 330px) 1fr; align-items: flex-start; border-bottom: 1px solid #ccc; padding-bottom: 10px; gap: 16px; }
        .logo-section { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .company-logo { max-width: 70px; height: auto; }
        .airline-logos { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        .airline-logo { max-width: 140px; max-height: 45px; object-fit: contain; border: 1px solid #e0e0e0; background: #fff; padding: 4px; }
        .airline-name { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.03em; }
        .print-bg-section { display: flex; align-items: center; justify-content: center; min-width: 0; padding-top: 2px; }
        .print-bg-image { width: 390px; max-width: 430px; max-height: 82px; height: auto; object-fit: contain; display: block; }
        .ref-info { text-align: right; }
        .ref-row { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 4px; font-weight: bold; }
        
        /* Metadata Grid */
        .meta-grid { display: grid; grid-template-columns: 1.5fr 1.5fr 1fr; border-bottom: 1px dashed #ccc; padding: 15px 0; margin-bottom: 20px; }
        .meta-col { padding: 0 15px; border-right: 1px dotted #ccc; }
        .meta-col:last-child { border-right: none; display: flex; flex-direction: column; align-items: center; }
        .label { font-size: 9px; font-weight: bold; color: #000; margin-bottom: 3px; display: block; }
        .value { font-size: 11px; font-weight: bold; }
        
        /* Barcode Simulation */
        .barcode-box { text-align: center; font-family: monospace; }
        .barcode-lines { letter-spacing: -1px; font-size: 24px; line-height: 1; margin: 0; }

        /* Tables & Sections */
        .section-header { font-weight: bold; font-size: 11px; margin: 15px 0 5px 0; text-transform: uppercase; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e0e0e0; }
        .data-table th { background: #fff; text-align: left; padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 10px; color: #000; }
        .data-table td { padding: 10px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
        
        /* Umrah Package Specific */
        .duration-box { border: 1px solid #333; padding: 4px 8px; border-radius: 4px; display: inline-block; color: #999; font-weight: bold; }
        .hotel-info { display: flex; align-items: flex-start; gap: 8px; }
        .hotel-icon { font-size: 14px; }

        /* Itinerary Header */
        .itinerary-sub { font-weight: bold; margin: 10px 0; display: flex; align-items: center; gap: 10px; }
        
        /* Terms */
        .terms { font-size: 10px; font-weight: bold; margin-top: 30px; }
        .terms-title { border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
        .terms-item { margin-bottom: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                <img class="company-logo" src="${companyLogoUrl}" alt="Shaheen Wings Logo" />
                <div class="airline-logos">${airlineLogoHTML}</div>
            </div>
            <div class="print-bg-section">
                <img class="print-bg-image" src="${umrahPrintBgUrl}" alt="Umrah Print Header" />
            </div>
            <div class="ref-info">
                <div class="ref-row">
                    <span>TICKET#</span>
                    <span>${ticketNumber}</span>
                </div>
                ${showPNR ? `<div class="ref-row">
                    <span>PNR:</span>
                    <span>${pnr}</span>
                </div>` : ""}
            </div>
        </div>

        <!-- Meta Info -->
        <div class="meta-grid">
            <div class="meta-col">
                <span class="label">BOOKED BY:</span>
                <span class="value">${bookedBy}</span>
                <br><br>
                <span class="label">CONTACT:</span>
                <span class="value">${contact}</span>
            </div>
            <div class="meta-col">
                <span class="label">RESERVED ON:</span>
                <span class="value">${formatPrintDate(issuedOn)} | ${formatPrintTime(issuedOn)}</span>
            </div>
            <div class="meta-col">
                <div class="barcode-box">
                    <div style="font-size: 10px; font-weight: bold;">0010650</div>
                    <div style="font-size: 10px; font-weight: bold;">${ticketNumber}</div>
                </div>
            </div>
        </div>

        <div class="section-header">UMRAH PACKAGE</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 15%;">DURATION</th>
                    <th style="width: 55%;">HOTEL</th>
                    <th style="width: 15%;">ROOM</th>
                    <th style="width: 15%;">TRANSPORT</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><div class="duration-box">${duration.toUpperCase()}</div></td>
                    <td>
                        <div class="hotel-info">
                            <div style="font-weight: bold; text-transform: uppercase;">
                                ${hotelDisplay}
                            </div>
                        </div>
                    </td>
                    <td style="font-weight: bold;">${roomType.toUpperCase()}</td>
                    <td style="font-weight: bold;">${transport.toUpperCase()}</td>
                </tr>
            </tbody>
        </table>

        <div class="section-header">Passenger Name</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 5%;">SR</th>
                    <th style="width: 45%;">NAME</th>
                    <th style="width: 25%;">PASSPORT</th>
                    <th style="width: 25%;">OUTBOUND</th>
                </tr>
            </thead>
            <tbody>
                ${passengers.map((p, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td style="font-weight: bold; text-transform: uppercase;">${p.title || 'MR'} ${p.givenName} ${p.surName}</td>
                        <td style="font-weight: bold;">${p.passport}</td>
                        <td style="font-weight: bold;">ANY SET</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="section-header">Travel Itinerary</div>
        ${itinerary.map((seg) => {
        const origin = safeValue(seg.sectorFrom || seg.origin, "N/A").toUpperCase();
        const destination = safeValue(seg.sectorTo || seg.destination, "N/A").toUpperCase();
        return `
                <div class="itinerary-sub">${origin} ✈ ${destination}</div>
                <table class="data-table">
                    <thead>  
                        <tr>
                            <th>DATE</th>
                            <th>TIMES</th>
                            <th>FLIGHT</th>
                            <th>FLIGHT #</th>
                            <th>MEAL</th>
                            <th>BAGGAGE</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="font-weight: bold;">${formatPrintDate(seg.depDate || seg.flightDate)}</td>
                            <td style="font-weight: bold;">${safeValue(seg.depTime, "N/A")}</td>
                            <td style="font-weight: bold;">${origin}<br>${destination}</td>
                            <td style="font-weight: bold;">${safeValue(seg.flightNo || seg.flightNumber, "PA 472")}<br>ECONOMY</td>
                            <td style="font-weight: bold;">${safeValue(seg.meal, "YES")}</td>
                            <td style="font-weight: bold;">${safeValue(seg.baggage, "20+7 KG")}</td>
                        </tr>
                    </tbody>
                </table>
            `;
    }).join('')}

        <div class="terms">
            <div class="terms-title">Terms & Conditions</div>
            <div class="terms-item">1- PASSENGER SHOULD REPORT AT CHECK IN COUNTER AT LEAST 04:00 HOURS PRIOR TO FLIGHT.</div>
            <div class="terms-item">2- AFTER CONFIRMATION TICKET ARE NON REFUNDABLE AND NON CHANGEABLE ANY TIME.</div>
        </div>
    </div>
</body>
</html>`;

    // Printing Logic (Unchanged)
    const printContainer = document.createElement("div");
    printContainer.id = "__umrah_ticket_print__";
    printContainer.innerHTML = ticketHTML;

    const printStyle = document.createElement("style");
    printStyle.id = "__umrah_ticket_print_style__";
    printStyle.innerHTML = `
        @media print {
            body > *:not(#__umrah_ticket_print__) { display: none !important; }
            #__umrah_ticket_print__ { display: block !important; }
        }
        #__umrah_ticket_print__ { display: none; }
    `;

    document.head.appendChild(printStyle);
    document.body.appendChild(printContainer);

    const cleanup = () => {
        const container = document.getElementById("__umrah_ticket_print__");
        const style = document.getElementById("__umrah_ticket_print_style__");
        if (container) document.body.removeChild(container);
        if (style) document.head.removeChild(style);
        window.removeEventListener("afterprint", cleanup);
    };

    const triggerPrint = () => {
        window.addEventListener("afterprint", cleanup);
        printContainer.style.display = "block";
        window.print();
        setTimeout(cleanup, 2000);
    };

    const images = Array.from(printContainer.querySelectorAll("img"));
    if (images.length === 0) {
        triggerPrint();
        return;
    }

    Promise.all(
        images.map(
            (img) =>
                new Promise((resolve) => {
                    if (img.complete) {
                        resolve();
                        return;
                    }
                    img.onload = img.onerror = () => resolve();
                }),
        ),
    ).then(triggerPrint);   
};
