import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyUmrahBookings } from "../../../api/umrahBookingApi";
import { theme } from "../../../theme/theme";
import { FaPlaneDeparture } from "react-icons/fa";
import { Loader2, Package, ChevronRight } from "lucide-react";

const STATUS_COLORS = {
  pending:   { bg: "#FEF3C7", text: "#92400E" },
  confirmed: { bg: "#D1FAE5", text: "#065F46" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B" },
  completed: { bg: "#DBEAFE", text: "#1E40AF" },
};

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d)) return "N/A";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export default function UmrahPackageBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyUmrahBookings()
      .then((res) => setBookings(res.data || []))
      .catch(() => setError("Failed to load bookings. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: "12px", color: "#718096" }}>
        <Loader2 size={40} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <p style={{ margin: 0 }}>Loading your bookings…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "#991B1B" }}>
        <p style={{ fontSize: "1rem" }}>{error}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: "12px", padding: "8px 20px", background: theme.colors.ublGradient, color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Inter, system-ui, sans-serif", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: theme.colors.ublGradient, borderRadius: "16px", padding: "28px 30px", color: "white", marginBottom: "28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <Package size={32} />
          <div>
            <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>My Umrah Package Bookings</h1>
            <p style={{ margin: 0, opacity: 0.85, fontSize: "0.9rem" }}>Track and manage your Umrah package reservations</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/dashboard/umrah-packages")}
          style={{ padding: "10px 20px", background: "rgba(255,255,255,0.2)", color: "white", border: "2px solid rgba(255,255,255,0.5)", borderRadius: "10px", fontWeight: 600, cursor: "pointer", backdropFilter: "blur(5px)" }}
        >
          + New Booking
        </button>
      </div>

      {/* Empty state */}
      {bookings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <Package size={60} color="#cbd5e0" style={{ marginBottom: "16px" }} />
          <h3 style={{ color: "#4a5568", marginBottom: "8px" }}>No Bookings Yet</h3>
          <p style={{ color: "#718096", marginBottom: "24px" }}>You haven't made any Umrah package bookings yet.</p>
          <button
            onClick={() => navigate("/dashboard/umrah-packages")}
            style={{ padding: "12px 28px", background: theme.colors.ublGradient, color: "white", border: "none", borderRadius: "10px", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" }}
          >
            Browse Packages
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {bookings.map((b) => {
            const statusStyle = STATUS_COLORS[b.status] || { bg: "#f3f4f6", text: "#374151" }; 
            const flights = b.packageData?.flights || [];
            return (
              <div
                key={b._id}
                style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.2s" }}
                onClick={() => navigate(`/dashboard/umrah-package-bookings/${b._id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.10)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)")}
              >
                {/* Top bar */}
                <div style={{ background: "#f8fafc", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <FaPlaneDeparture color="#21397C" />
                    <span style={{ fontWeight: 700, color: "#1a202c", fontSize: "1rem" }}>{b.bookingNumber}</span>
                  </div>
                  <span style={{ background: statusStyle.bg, color: statusStyle.text, padding: "4px 12px", borderRadius: "999px", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase" }}>
                    {b.status}
                  </span>
                </div>

                {/* Body */}
                <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: "1.05rem", fontWeight: 700, color: "#1a202c" }}>{b.packageName}</h3>
                    <div style={{ fontSize: "0.82rem", color: "#718096", marginBottom: "4px" }}>
                      Room: <strong style={{ color: "#4a5568", textTransform: "capitalize" }}>{b.roomType}</strong>
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#718096" }}>
                      Passengers: <strong style={{ color: "#4a5568" }}>{b.passengers?.length || 0}</strong>
                      {" · "}Adults: <strong style={{ color: "#4a5568" }}>{b.passengers?.filter((p) => p.type === "Adult").length || 0}</strong>
                      {b.passengers?.filter((p) => p.type === "Child").length > 0 && (
                        <> · Children: <strong style={{ color: "#3B82F6" }}>{b.passengers.filter((p) => p.type === "Child").length}</strong></>
                      )}
                      {b.passengers?.filter((p) => p.type === "Infant").length > 0 && (
                        <> · Infants: <strong style={{ color: "#8B5CF6" }}>{b.passengers.filter((p) => p.type === "Infant").length}</strong></>
                      )}
                    </div>
                    {(!b.passengers || b.passengers.length === 0) && (
                      <div style={{ marginTop: "6px" }}>
                        <span style={{ display: "inline-block", background: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D", fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px" }}>
                          ⚠ Passenger Details Missing
                        </span>
                      </div>
                    )}
                    {flights.length > 0 && (
                      <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "#718096" }}>
                        ✈ {flights[0]?.sectorFrom} → {flights[0]?.sectorTo}
                        {flights[0]?.depDate && <span> · {formatDate(flights[0].depDate)}</span>}
                      </div>
                    )}
                    {b.adminNote && (
                      <div style={{ marginTop: "8px", padding: "6px 10px", background: "#FEF3C7", borderRadius: "8px", fontSize: "0.78rem", color: "#92400E" }}>
                        📝 {b.adminNote}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: theme.colors.success }}>
                      PKR {(b.pricing?.totalAmount || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#a0aec0" }}>Booked on {formatDate(b.createdAt)}</div>
                    <ChevronRight size={18} color="#a0aec0" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
