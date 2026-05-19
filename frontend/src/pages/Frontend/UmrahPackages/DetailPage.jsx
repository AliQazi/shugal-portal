import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaCar, FaBus, FaPlaneDeparture, FaHotel, FaCheckCircle, FaMapMarkerAlt, FaStar, FaMapMarkedAlt } from "react-icons/fa";
import { Ticket, ClipboardCheck, Info } from "lucide-react";

const GRADIENT = "linear-gradient(135deg, #1a2a4a 0%, #1a4a4a 100%)";

const getStoredPackageGroup = (search) => {
  try {
    const params = new URLSearchParams(search);
    const key = params.get("pkg");
    if (!key) return null;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getPackageStorageKey = (pkg) => {
  const id = pkg?.package_id || pkg?.packageId || pkg?.id || pkg?._id || pkg?.flight?.id || pkg?.flight?.flight_details?.pnr || pkg?.packageName || "package";
  return `umrahPackageDetail_${String(id).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
};

const getHotelsArray = (hotels) => {
  if (Array.isArray(hotels)) return hotels;
  if (!hotels || typeof hotels !== "object") return [];
  return Object.values(hotels).filter(Boolean);
};

const PRIMARY = "#21397C";
const SUCCESS = "#22c55e";

const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "16px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
  border: "1px solid #e2e8f0",
};

const cardTitleStyle = {
  marginTop: 0,
  marginBottom: "15px",
  fontSize: "1rem",
  color: "#1a202c",
  fontWeight: 700,
};

const priBtn = {
  flex: 1,
  background: GRADIENT,
  color: "white",
  border: "none",
  padding: "12px",
  borderRadius: "10px",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "1rem",
};

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d)) return "N/A";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const formatTime = (time) => (time ? time.slice(0, 5) : "N/A");

// ─────────── HOTEL CARD ───────────
function HotelCard({ hotel, city }) {
  if (!hotel) return null;

  const getCityImage = () => {
    const c = (city || "").toLowerCase();
    if (c.includes("makkah") || c.includes("mecca"))
      return "https://www.mtctutorials.com/wp-content/uploads/2022/06/Kaaba-High-Quality-PNG-Image-1.png";
    if (c.includes("madin") || c.includes("medina"))
      return "https://png.pngtree.com/png-clipart/20220616/original/pngtree-prophet-mohammad-madina-or-madinah-nabawi-mosque-masjid-milad-un-nabi-png-image_8081426.png";
    return "https://static.vecteezy.com/system/resources/previews/024/160/410/non_2x/blank-board-with-shop-store-building-icon-in-peach-and-white-color-vector.jpg";
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
        border: "1px solid #f1f1f1",
        transition: "all 0.3s ease",
      }}
    >
      <div style={{ padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <img
            src={getCityImage()}
            alt={city}
            style={{ height: 48, width: 48, objectFit: "contain", borderRadius: "10px", background: "#f8fafc" }}
          />
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#1e2937" }}>{city}</h3>
        </div>

        <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#0f172a", marginBottom: "10px" }}>
          {hotel.hotelName || hotel.name || "Hotel"}
        </div>

        {hotel.nights > 0 && (
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "8px" }}>
            🌙 {hotel.nights} Night{hotel.nights !== 1 ? "s" : ""}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {hotel.distance > 0 && (
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                padding: "5px 10px", borderRadius: "999px",
                background: "linear-gradient(135deg, #ff6b6b, #ff8787)",
                color: "#fff", fontWeight: 600, fontSize: "12px",
              }}
            >
              <FaMapMarkerAlt size={12} /> {hotel.distance} m
            </span>
          )}
          {hotel.rating > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#64748b" }}>
              {Array.from({ length: Math.floor(hotel.rating) }).map((_, i) => (
                <FaStar key={i} color="#facc15" size={13} />
              ))}
              <span style={{ fontWeight: 600, color: "#1e2937", fontSize: "0.85rem" }}>{hotel.rating}.0</span>
            </span>
          )}
        </div>

        {hotel.mapUrl && (
          <a
            href={hotel.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              marginTop: "10px", fontSize: "0.8rem", color: "#1e88e5",
              textDecoration: "none", fontWeight: 600,
            }}
          >
            <FaMapMarkedAlt size={14} /> View on Map
          </a>
        )}
      </div>
    </div>
  );
}

// ─────────── FLIGHT INFO ───────────
function FlightInfo({ label, data, icon }) {
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
      <div style={{ marginTop: "4px" }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#a0aec0", textTransform: "uppercase" }}>
          {label}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
          <span style={{ fontWeight: 700, color: "#2d3748" }}>{formatDate(data?.depDate)}</span>
          <span style={{ fontSize: "0.8rem", background: "#edf2f7", padding: "2px 8px", borderRadius: "4px" }}>
            {data?.flightNo}
          </span>
        </div>
        <div style={{ fontSize: "0.85rem", color: "#718096" }}>
          {formatTime(data?.depTime)} • {data?.sectorFrom} → {data?.sectorTo}
        </div>
        <div style={{ fontSize: "0.8rem", color: "#a0aec0", marginTop: "4px" }}>
          Arrival: {formatDate(data?.arrDate)} {formatTime(data?.arrTime)}
        </div>
        {(data?.baggage || data?.meal) && (
          <div style={{ fontSize: "0.8rem", color: "#718096", marginTop: "5px" }}>
            {data.flightClass && <span>{data.flightClass} • </span>}
            {data.baggage && <span>{data.baggage}KG</span>}
            {data.meal && <span> • Meal: {data.meal}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────── INCLUDES CARD ───────────
function IncludesCard() {
  const list = ["Visa", "Tickets", "Hotel", "Transport"];
  return (
    <div style={cardStyle}>
      <h3 style={{ ...cardTitleStyle, display: "flex", alignItems: "center", gap: "10px" }}>
        <ClipboardCheck size={18} /> Package Includes
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {list.map((item) => (
          <div
            key={item}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              fontSize: "0.85rem", color: "#4a5568",
              background: "#f7fafc", padding: "6px 12px",
              borderRadius: "8px", border: "1px solid #edf2f7",
            }}
          >
            <FaCheckCircle color={SUCCESS} size={12} /> {item}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────── TRANSPORT PILL ───────────
function TransportPill({ transport }) {
  if (!transport) return null;
  const Icon = transport.transportType?.toLowerCase().includes("car") ? FaCar : FaBus;
  return (
    <div
      style={{
        background: "#f8fafc", border: "1px solid #e2e8f0",
        borderRadius: "12px", padding: "10px 14px",
        display: "flex", alignItems: "center", gap: "10px", minWidth: "180px",
      }}
    >
      <div
        style={{
          width: "36px", height: "36px", background: "white", borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#1e2937",
        }}
      >
        <Icon size={18} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e2937" }}>{transport.route}</div>
        <div style={{ fontSize: "0.82rem", color: "#64748b" }}>{transport.transportType}</div>
      </div>
    </div>
  );
}

// ─────────── MAIN DETAIL PAGE ───────────
export default function DetailPage({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const groupFromState = location.state?.group;
  const groupFromStorage = getStoredPackageGroup(location.search);
  const group = groupFromState || groupFromStorage;

  const [selectedRoom, setSelectedRoom] = useState(() => {
    const rooms = group?.rooms || {};
    return (
      Object.keys(rooms).find((k) => rooms[k] !== null && rooms[k] !== undefined && rooms[k] !== 0) ||
      Object.keys(rooms)[0] ||
      "sharing"
    );
  });

  const packageFlights = group?.flights?.length > 0
    ? group.flights
    : Array.isArray(group?.details)
      ? group.details.map((detail) => ({
          flightNo: detail.flight_no || detail.flightNo || detail.flight_number || "",
          airline: group.airline?.airline_name || group.airline?.short_name || detail.airline || "",
          pnr: group.pnr || detail.pnr || "",
          sale_price: Number(group.price || group.flightPrice || detail.sale_price || 0),
          sectorFrom: detail.origin || detail.from || "",
          sectorTo: detail.destination || detail.to || "",
          depDate: detail.dep_date || detail.flight_date || detail.date ? new Date(detail.dep_date || detail.flight_date || detail.date) : null,
          depTime: detail.dept_time || detail.dep_time || detail.departure_time || "",
          arrDate: detail.arv_date || detail.arr_date || detail.arrival_date ? new Date(detail.arv_date || detail.arr_date || detail.arrival_date) : null,
          arrTime: detail.arv_time || detail.arr_time || detail.arrival_time || "",
          baggage: detail.baggage || detail.baggage_allowance || group.baggage || "",
          meal: detail.meal || detail.meals || group.meal || "",
          origin: detail.origin || detail.from || "",
          destination: detail.destination || detail.to || "",
        }))
      : [];

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!group) {
    return (
      <div style={{ padding: "100px 20px", textAlign: "center", color: "#718096" }}>
        <Info size={48} style={{ marginBottom: "10px", opacity: 0.5 }} />
        <h2>No package data found.</h2>
        <button onClick={() => navigate(-1)} style={{ ...priBtn, flex: "none", marginTop: "20px", padding: "10px 24px" }}>
          Go Back
        </button>
      </div>
    );
  }

  const roomPrices = group.rooms || {};
  const currentPrice = roomPrices[selectedRoom] || 0;

  // Group hotels by city
  const hotelsByCity = {};
  const hotelsList = getHotelsArray(group.hotels);
  hotelsList.forEach((hotel) => {
    const city = hotel.city || "Other";
    if (!hotelsByCity[city]) hotelsByCity[city] = [];
    hotelsByCity[city].push(hotel);
  });

  const roomOrder = ["sharing", "quint", "quad", "triple", "double"];
  const filteredRooms = roomOrder.filter(
    (r) => roomPrices[r] !== null && roomPrices[r] !== undefined && roomPrices[r] !== 0
  );

  return (
    <div
      style={{
        backgroundColor: "#f4f7fe",
        minHeight: "100vh",
        padding: isMobile ? "15px 12px" : "30px 20px",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .detail-grid { grid-template-columns: 1fr !important; }
          .hotel-grid  { grid-template-columns: 1fr !important; }
          .room-grid   { grid-template-columns: 1fr 1fr !important; }
          .header-inner{ flex-direction: column !important; align-items: flex-start !important; }
          .header-ref  { text-align: left !important; }
          .sticky-col  { position: static !important; }
        }
        @media (max-width: 480px) {
          .header-title { font-size: 1.4rem !important; }
        }
      `}</style>

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* HEADER */}
        <div
          style={{
            background: GRADIENT,
            borderRadius: "20px",
            padding: isMobile ? "20px" : "35px",
            color: "white",
            marginBottom: "30px",
            boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
          }}
        >
          <div
            className="header-inner"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <Ticket size={18} />
                <span style={{ textTransform: "uppercase", letterSpacing: "1px", fontSize: "0.72rem", fontWeight: 600, opacity: 0.8 }}>
                  {group.id || group._id}
                </span>
              </div>
              <h1
                className="header-title"
                style={{ margin: "0 0 12px 0", fontSize: "2rem", fontWeight: 800 }}
              >
                {group.packageName}
              </h1>
              {packageFlights.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {packageFlights.map((fl, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", opacity: 0.9 }}>
                      <FaPlaneDeparture size={13} />
                      <span>
                        {fl.depDate && (
                          <span style={{ fontWeight: 600 }}>
                            {new Date(fl.depDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} •{" "}
                          </span>
                        )}
                        {fl.sectorFrom}-{fl.sectorTo}
                        {fl.flightNo && <span> • {fl.flightNo}</span>}
                        {fl.depTime && <span> • {fl.depTime.slice(0, 5)}{fl.arrTime ? `–${fl.arrTime.slice(0, 5)}` : ""}</span>}
                        {fl.baggage && <span> • {fl.baggage}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="header-ref"
              style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}
            >
              {group.packageDuration > 0 && (
                <span style={{ background: "rgba(255,255,255,0.18)", padding: "6px 14px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700 }}>
                  📅 {group.packageDuration} DAYS
                </span>
              )}
              {(() => {
                const ns = getHotelsArray(group.hotels).map((h) => h.nights || 0).filter((n) => n > 0);
                return ns.length > 0 ? (
                  <span style={{ background: "rgba(255,255,255,0.18)", padding: "6px 14px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700 }}>
                    🌙 {ns.join("+")} NIGHTS
                  </span>
                ) : null;
              })()}
              {group.availableRooms > 0 && (
                <span style={{ background: "rgba(255,255,255,0.18)", padding: "6px 14px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700 }}>
                  👤 Seats: {group.availableRooms}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div
          className="detail-grid"
          style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.3fr 1fr", gap: "30px" }}
        >
          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Package Image */}
            {group.logo && (
              <div style={{ borderRadius: "20px", overflow: "hidden", height: isMobile ? "200px" : "340px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                <img
                  src={group.logo}
                  alt={group.packageName}
                  onError={(e) => { e.target.style.display = "none"; }}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}

            {/* Hotels */}
            {Object.keys(hotelsByCity).length > 0 && (
              <div>
                <h3 style={{ ...cardTitleStyle, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaHotel size={16} color={PRIMARY} /> Hotels
                </h3>
                <div
                  className="hotel-grid"
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
                >
                  {Object.entries(hotelsByCity).map(([city, hotels]) =>
                    hotels.map((hotel, i) => (
                      <HotelCard key={hotel._id || `${city}-${i}`} hotel={hotel} city={city} />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Package Includes */}
            <IncludesCard />

            {/* Transport */}
            {(group.transport || group.transports) && (group.transport || group.transports).length > 0 && (
              <div style={cardStyle}>
                <h3 style={{ ...cardTitleStyle, display: "flex", alignItems: "center", gap: "10px" }}>
                  <FaBus size={16} /> Transport Details
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {(group.transport || group.transports).map((item, i) => (
                    <TransportPill key={i} transport={item} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div
            className="sticky-col"
            style={{ position: isMobile ? "static" : "sticky", top: "20px", display: "flex", flexDirection: "column", gap: "24px" }}
          >
            {/* Flight Schedule */}
            {packageFlights.length > 0 && (
              <div style={cardStyle}>
                <h3 style={cardTitleStyle}>✈ Flight Schedule</h3>
                {packageFlights.map((flight, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div style={{ height: "1px", background: "#edf2f7", margin: "15px 0" }} />}
                    <FlightInfo
                      label={i === 0 ? "Departure" : `Return / Leg ${i + 1}`}
                      data={flight}
                      icon={<FaPlaneDeparture color={PRIMARY} size={14} />}
                    />
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Room Selection */}
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>🛏 Select Room & Book</h3>

              {filteredRooms.length > 0 ? (
                <div
                  className="room-grid"
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}
                >
                  {filteredRooms.map((room, i) => {
                    const isLastOdd = filteredRooms.length % 2 !== 0 && i === filteredRooms.length - 1;
                    return (
                      <button
                        key={room}
                        onClick={() => setSelectedRoom(room)}
                        style={{
                          padding: "12px",
                          borderRadius: "12px",
                          border: `2px solid ${selectedRoom === room ? PRIMARY : "#edf2f7"}`,
                          background: selectedRoom === room ? "#f0f7ff" : "white",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "0.2s",
                          gridColumn: isLastOdd ? "1 / -1" : "auto",
                        }}
                      >
                        <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#718096", fontWeight: 700 }}>
                          {room}
                        </div>
                        <div style={{ fontWeight: 700, color: "#2d3748" }}>
                          Rs. {Number(roomPrices[room]).toLocaleString()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: "#a0aec0", fontSize: "0.9rem" }}>No room prices configured.</p>
              )}

              {currentPrice > 0 && (
                <div style={{ marginTop: "20px", padding: "15px", background: "#f8fafc", borderRadius: "12px", textAlign: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "#718096" }}>Selected Price</span>
                  <div style={{ fontSize: "1.8rem", fontWeight: 800, color: SUCCESS }}>
                    PKR {currentPrice.toLocaleString()}
                  </div>
                </div>
              )}

              {/* Notes */}
              {group.notes && (
                <div
                  style={{
                    marginTop: "14px", background: "#fffbeb", border: "1px solid #fcd34d",
                    borderRadius: "10px", padding: "10px 14px",
                    display: "flex", alignItems: "flex-start", gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "1rem" }}>📋</span>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#78350f" }}>
                    <strong>Note: </strong>{group.notes}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button onClick={() => navigate(-1)} style={{ ...priBtn, background: "#e2e8f0", color: "#4a5568", flex: "0 0 auto", padding: "12px 20px" }}>
                  ← Back
                </button>
                <button
                  disabled={!currentPrice}
                  onClick={() => {
                    const key = getPackageStorageKey(group);
                    try {
                      sessionStorage.setItem(key, JSON.stringify(group));
                    } catch (err) {
                      console.warn("Failed to persist booking package state", err);
                    }
                    navigate(`/dashboard/umrah-packages/book?pkg=${encodeURIComponent(key)}`, {
                      state: {
                        packageData: group,
                        selectedRoom,
                        pricePerPerson: currentPrice,
                      },
                    });
                  }}
                  style={{ ...priBtn, opacity: currentPrice ? 1 : 0.5, cursor: currentPrice ? "pointer" : "not-allowed" }}
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
