import { useState, useEffect, useCallback } from "react";
import {
  adminGetAllUmrahBookings,
  adminUpdateUmrahBookingStatus,
  UmrahBooking,
} from "../../Api/umrahPackageBookingApi";
import { toast } from "react-toastify";

const STATUS_OPTIONS = ["pending", "confirmed", "cancelled", "completed"] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  pending:   { bg: "bg-yellow-100",  text: "text-yellow-800",  dot: "bg-yellow-500"  },
  confirmed: { bg: "bg-green-100",   text: "text-green-800",   dot: "bg-green-500"   },
  cancelled: { bg: "bg-red-100",     text: "text-red-800",     dot: "bg-red-500"     },
  completed: { bg: "bg-blue-100",    text: "text-blue-800",    dot: "bg-blue-500"    },
};

const fmtDate = (d?: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
};

// ── Passenger detail modal ──────────────────────────────────────────────────
function PassengerModal({
  booking,
  onClose,
}: {
  booking: UmrahBooking;
  onClose: () => void;
}) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative z-100000 bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-30 bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f] text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold">{booking.bookingNumber}</h2>
            <p className="text-sm opacity-80">{booking.packageName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors text-white font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Booking info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Agent", booking.user?.name || "—"],
              ["Email", booking.user?.email || "—"],
              ["Phone", booking.user?.phone || "—"],
              ["Room Type", booking.roomType],
              ["Total Amount", `PKR ${(booking.pricing?.totalAmount || 0).toLocaleString()}`],
              ["Booked On", fmtDate(booking.createdAt)],
            ].map(([label, value]) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 block mb-0.5">{label}</span>
                <span className="font-semibold text-gray-800 capitalize">{value}</span>
              </div>
            ))}
          </div>

          {/* Passengers */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">
              Passengers ({booking.passengers?.length || 0})
            </h3>
            <div className="space-y-2">
              {(booking.passengers || []).map((p, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-xl p-3 bg-gray-50 grid grid-cols-2 gap-2 text-xs"
                >
                  <div className="col-span-2 flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        p.type === "Child"
                          ? "bg-blue-100 text-blue-800"
                          : p.type === "Infant"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {p.type}
                    </span>
                    <span className="font-bold text-gray-800 text-sm">
                      {p.title}. {p.givenName} {p.surName}
                    </span>
                  </div>
                  {[
                    ["Passport", p.passport],
                    ["Nationality", p.nationality],
                    ["DOB", p.dateOfBirth || "—"],
                    ["Expiry", p.passportExpiry || "—"],
                  ].map(([lbl, val]) => (
                    <div key={lbl}>
                      <span className="text-gray-500">{lbl}: </span>
                      <span className="font-medium text-gray-700">{val}</span>
                    </div>
                  ))}
                  {p.passportFileUrl && (
                    <div className="col-span-2 mt-1">
                      <a
                        href={p.passportFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        📎 View Passport File
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Special requests */}
          {booking.specialRequests && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <p className="text-xs text-yellow-700 font-semibold mb-1">Special Requests</p>
              <p className="text-sm text-yellow-900">{booking.specialRequests}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Status update modal ─────────────────────────────────────────────────────
function StatusModal({
  booking,
  onClose,
  onSave,
}: {
  booking: UmrahBooking;
  onClose: () => void;
  onSave: (id: string, status: UmrahBooking["status"], note: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<UmrahBooking["status"]>(booking.status);
  const [note, setNote] = useState(booking.adminNote || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await onSave(booking._id, status, note);
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative z-100000 bg-white rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-30 bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f] text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
          <h3 className="font-bold text-lg">Update Booking Status</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Booking: <strong className="text-gray-800">{booking.bookingNumber}</strong>
          </p>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as UmrahBooking["status"])}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">
              Admin Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add a note visible to the agent…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function UmrahPackageBookingsAdmin() {
  const [bookings, setBookings] = useState<UmrahBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailBooking, setDetailBooking] = useState<UmrahBooking | null>(null);
  const [statusBooking, setStatusBooking] = useState<UmrahBooking | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetAllUmrahBookings(page, filterStatus || undefined);
      setBookings(res.data.data);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [filterStatus]);

  const handleStatusSave = async (id: string, status: string, adminNote: string) => {
    try {
      await adminUpdateUmrahBookingStatus(id, status, adminNote);
      toast.success("Status updated");
      setStatusBooking(null);
      fetchBookings();
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f] rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Umrah Package Bookings</h1>
            <p className="text-sm opacity-80">
              {total} booking{total !== 1 ? "s" : ""} found
            </p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white/10 border border-white/30 text-white rounded-xl px-4 py-2 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-gray-800"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex gap-3 mt-4 flex-wrap">
          {STATUS_OPTIONS.map((s) => {
            const count = bookings.filter((b) => b.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filterStatus === s
                    ? "bg-white text-[#1e3a5f]"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}: {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Loading bookings…</p>
            </div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📦</div>
            <p className="font-semibold text-gray-500">No bookings found</p>
            {filterStatus && (
              <button
                onClick={() => setFilterStatus("")}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f]">
                <tr>
                  {[
                    "Booking #",
                    "Agent",
                    "Package",
                    "Room",
                    "Passengers",
                    "Total (PKR)",
                    "Status",
                    "Booked On",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[#3d6fa8] last:border-r-0 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, idx) => {
                  const ss = STATUS_STYLES[b.status] || STATUS_STYLES.pending;
                  return (
                    <tr
                      key={b._id}
                      className={`border-b border-gray-100 transition-colors hover:bg-blue-50/30 ${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      }`}
                    >
                      <td className="px-4 py-3 text-xs font-bold text-[#1e3a5f] whitespace-nowrap">
                        {b.bookingNumber}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-gray-800">{b.user?.name || "—"}</div>
                        <div className="text-gray-500 text-[11px]">{b.user?.email || ""}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-gray-800 max-w-45 truncate">
                          {b.packageName}
                        </div>
                        {b.adminNote && (
                          <div className="text-[11px] text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded mt-1 truncate max-w-45">
                            📝 {b.adminNote}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs capitalize text-gray-700 whitespace-nowrap">
                        {b.roomType}
                      </td>
                      <td className="px-4 py-3 text-xs text-center text-gray-700">
                        {b.passengers?.length || 0}
                        <div className="text-[10px] text-gray-400">
                          {(b.passengers?.filter((p) => p.type === "Adult").length || 0)}A
                          {(b.passengers?.filter((p) => p.type === "Child").length || 0) > 0 &&
                            ` · ${b.passengers.filter((p) => p.type === "Child").length}C`}
                          {(b.passengers?.filter((p) => p.type === "Infant").length || 0) > 0 &&
                            ` · ${b.passengers.filter((p) => p.type === "Infant").length}I`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-green-700 whitespace-nowrap">
                        {(b.pricing?.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ss.bg} ${ss.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />
                          {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {fmtDate(b.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDetailBooking(b)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors whitespace-nowrap"
                          >
                            View
                          </button>
                          <button
                            onClick={() => setStatusBooking(b)}
                            className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors whitespace-nowrap"
                          >
                            Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {detailBooking && (
        <PassengerModal booking={detailBooking} onClose={() => setDetailBooking(null)} />
      )}
      {statusBooking && (
        <StatusModal
          booking={statusBooking}
          onClose={() => setStatusBooking(null)}
          onSave={handleStatusSave}
        />
      )}
    </div>
  );
}


