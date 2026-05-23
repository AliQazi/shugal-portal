import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUmrahBookingById } from "../../../api/umrahBookingApi";
import { theme } from "../../../theme/theme";
import { Loader2, Package, ChevronLeft } from "lucide-react";
import TopBar from "../../../components/TopBar/TopBar";

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const statusStyles = {
  pending: { bg: "#FEF3C7", text: "#92400E" },
  confirmed: { bg: "#D1FAE5", text: "#065F46" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B" },
  completed: { bg: "#DBEAFE", text: "#1E40AF" },
};

export default function UmrahPackageBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBooking = async () => {
      try {
        setLoading(true);
        const res = await getUmrahBookingById(id);
        if (res.success) {
          setBooking(res.data);
        } else {
          setError(res.message || "Booking not found.");
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load booking details.");
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-gray-500" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-md p-8 text-center max-w-lg w-full">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Unable to load booking</h2>
          <p className="text-sm text-slate-600 mb-6">{error || "Booking not found."}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const status = booking.status || "pending";
  const passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
  const packageData = booking.packageData || {};
  const flight = Array.isArray(packageData.flights) ? packageData.flights[0] : packageData.flights || {};
  const style = statusStyles[status] || statusStyles.pending;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar title={`Umrah Booking ${booking.bookingNumber || "Details"}`} />
      <div className="max-w-6xl mx-auto p-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="grid gap-6">
          <div className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.18em] text-slate-500">Booking Reference</div>
                <h1 className="text-2xl font-bold text-slate-900 mt-2">{booking.bookingNumber}</h1>
              </div>
              <span className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold" style={{ background: style.bg, color: style.text }}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Package</div>
                <div className="mt-2 text-base font-semibold text-slate-900">{booking.packageName || "Umrah Package"}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Room Type</div>
                <div className="mt-2 text-base font-semibold text-slate-900">{booking.roomType || "N/A"}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Passengers</div>
                <div className="mt-2 text-base font-semibold text-slate-900">{passengers.length}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Total Amount</div>
                <div className="mt-2 text-base font-semibold text-slate-900">PKR {(booking.pricing?.totalAmount || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Passenger Details</h2>
              {passengers.length === 0 ? (
                <div className="text-sm text-slate-500">No passenger information saved yet.</div>
              ) : (
                <div className="space-y-4">
                  {passengers.map((passenger, idx) => (
                    <div key={idx} className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-slate-900">
                            {passenger.title} {passenger.givenName} {passenger.surName}
                          </div>
                          <div className="text-sm text-slate-500">{passenger.type || "Adult"}</div>
                        </div>
                        <div className="text-sm text-slate-500">Passport: {passenger.passport || "N/A"}</div>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Nationality</div>
                          <div className="mt-1 text-sm text-slate-700">{passenger.nationality || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.14em] text-slate-400">DoB</div>
                          <div className="mt-1 text-sm text-slate-700">{formatDate(passenger.dateOfBirth)}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Passport expiry</div>
                          <div className="mt-1 text-sm text-slate-700">{formatDate(passenger.passportExpiry)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Package Snapshot</h2>
              <div className="space-y-3 text-sm text-slate-700">
                <div>
                  <div className="text-slate-500">Package name</div>
                  <div className="font-semibold text-slate-900">{packageData.packageName || booking.packageName || "Umrah Package"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Flights</div>
                  <div className="font-semibold text-slate-900">{flight?.sectorFrom || "N/A"} → {flight?.sectorTo || "N/A"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Departure</div>
                  <div className="font-semibold text-slate-900">{formatDate(flight?.depDate)}</div>
                </div>
                {booking.specialRequests && (
                  <div>
                    <div className="text-slate-500">Special requests</div>
                    <div className="rounded-2xl bg-slate-50 p-3 text-slate-700">{booking.specialRequests}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
