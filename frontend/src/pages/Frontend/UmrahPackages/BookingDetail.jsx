import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUmrahBookingById, updateUmrahBookingPassengers } from "../../../api/umrahBookingApi";
import { theme } from "../../../theme/theme";
import { Loader2, Package, ChevronLeft, Upload, Scan, AlertTriangle, Printer } from "lucide-react";
import TopBar from "../../../components/TopBar/TopBar";
import { parseMRZ } from "../../../utils/parseMRZ";
import { printUmrahPackageBooking } from "../../../utils/umrahBookingPDFService";
import { toast } from "react-toastify";

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
  const [editMode, setEditMode] = useState(false);
  const [editPassengers, setEditPassengers] = useState([]);
  const [pendingFiles, setPendingFiles] = useState({});
  const [saving, setSaving] = useState(false);
  const [mrzModal, setMrzModal] = useState({ open: false, index: null });
  const [mrzInput, setMrzInput] = useState("");
  const [mrzError, setMrzError] = useState("");

  const mkTemplate = (type) => ({ type, title: type === "Child" ? "CHLD" : type === "Infant" ? "INF" : "Mr", givenName: "", surName: "", passport: "", dateOfBirth: "", passportExpiry: "", nationality: "Pakistan" });

  const changeField = (i, field, val) => {
    setEditPassengers((prev) => {
      const list = [...prev];
      list[i] = { ...list[i], [field]: val };
      return list;
    });
  };

  const handleMrzParse = () => {
    const blocks = mrzInput.trim().split(/\n[ \t]*\n/);
    let results = [];
    if (blocks.length > 1) {
      results = blocks.map((b) => parseMRZ(b.trim())).filter(Boolean);
    } else {
      const lines = mrzInput.trim().split("\n").map((l) => l.trim()).filter(Boolean);
      for (let i = 0; i + 1 < lines.length; i += 2) {
        const r = parseMRZ(lines[i] + "\n" + lines[i + 1]);
        if (r) results.push(r);
      }
    }
    if (!results.length) { setMrzError("Invalid MRZ."); return; }
    const si = mrzModal.index;
    setEditPassengers((prev) => {
      const list = [...prev];
      results.forEach((r, offset) => {
        const idx = si + offset;
        if (idx >= list.length) return;
        const fmtDate = (d) => (d instanceof Date && !isNaN(d) ? d.toISOString().split("T")[0] : "");
        list[idx] = { ...list[idx], surName: r.surName || list[idx].surName, givenName: r.givenName || list[idx].givenName, passport: r.passport || list[idx].passport, nationality: r.nationality || list[idx].nationality, dateOfBirth: fmtDate(r.dateOfBirth) || list[idx].dateOfBirth, passportExpiry: fmtDate(r.passportExpiry) || list[idx].passportExpiry, title: r.title || list[idx].title };
      });
      return list;
    });
    toast.success(`${results.length} passport(s) scanned!`);
    setMrzModal({ open: false, index: null });
    setMrzInput(""); setMrzError("");
  };

  const handleSavePassengers = async () => {
    const hasIncomplete = editPassengers.some((p) => !p.givenName || !p.surName || !p.passport || !p.nationality);
    if (hasIncomplete) { toast.error("Please fill in all passenger details (name, passport, nationality) before saving."); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("passengers", JSON.stringify(editPassengers));
      Object.entries(pendingFiles).forEach(([idx, file]) => {
        fd.append(`passportFile_${idx}`, file, `pax-${idx}-${file.name}`);
      });
      const res = await updateUmrahBookingPassengers(id, fd);
      if (res.success) {
        toast.success("Passenger details saved!");
        setBooking(res.data);
        setEditMode(false);
        setPendingFiles({});
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save passengers");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const loadBooking = async () => {
      try {
        setLoading(true);
        const res = await getUmrahBookingById(id);
        if (res.success) {
          setBooking(res.data);
          if (Array.isArray(res.data.passengers) && res.data.passengers.length === 0 && res.data.status === "pending") {
            const adultsCount = res.data.adultsCount ?? (res.data.packageData?.adults ?? 1);
            const childrenCount = res.data.childrenCount ?? (res.data.packageData?.children ?? 0);
            const infantsCount = res.data.infantsCount ?? (res.data.packageData?.infants ?? 0);
            const templates = [
              ...Array(adultsCount > 0 ? adultsCount : Math.max(1, (Array.isArray(res.data.passengers) ? res.data.passengers.filter((p) => p.type === "Adult").length : 0))).fill(null).map(() => mkTemplate("Adult")),
              ...Array(childrenCount).fill(null).map(() => mkTemplate("Child")),
              ...Array(infantsCount).fill(null).map(() => mkTemplate("Infant")),
            ];
            setEditPassengers(templates);
            setEditMode(true);
          }
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
  const passengersMissing = passengers.length === 0 && status === "pending";

  const openEditMode = () => {
    const adultsCount = booking.adultsCount ?? (packageData?.adults ?? 1);
    const childrenCount = booking.childrenCount ?? (packageData?.children ?? 0);
    const infantsCount = booking.infantsCount ?? (packageData?.infants ?? 0);
    const templates = [
      ...Array(adultsCount > 0 ? adultsCount : Math.max(1, passengers.filter((p) => p.type === "Adult").length)).fill(null).map(() => mkTemplate("Adult")),
      ...Array(childrenCount).fill(null).map(() => mkTemplate("Child")),
      ...Array(infantsCount).fill(null).map(() => mkTemplate("Infant")),
    ];
    setEditPassengers(templates);
    setEditMode(true); 
  };

  return (
    <>
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
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold" style={{ background: style.bg, color: style.text }}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
                <button
                  onClick={() => printUmrahPackageBooking(booking)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                >
                  <Printer size={16} /> Print Ticket
                </button>
              </div>
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Passenger Details</h2>
                {passengersMissing && !editMode && (
                  <button
                    onClick={openEditMode}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors"
                  >
                    Fill Passenger Details
                  </button>
                )}
              </div>

              {editMode ? (
                <div>
                  <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-3 text-sm text-amber-800">
                    Fill in the passenger details below, then click <strong>Save Passengers</strong>.
                  </div>
                  <div className="space-y-4">
                    {editPassengers.map((p, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-700">{p.type} {i + 1}</span>
                          <button type="button" onClick={() => { setMrzModal({ open: true, index: i }); setMrzInput(""); setMrzError(""); }} className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
                            <Scan size={12} /> MRZ Scan
                          </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Title</label>
                            <select value={p.title} onChange={(e) => changeField(i, "title", e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white">
                              {p.type === "Adult" && <><option>Mr</option><option>Mrs</option><option>Ms</option></>}
                              {p.type === "Child" && <option>CHLD</option>}
                              {p.type === "Infant" && <option>INF</option>}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Given Name *</label>
                            <input value={p.givenName} onChange={(e) => changeField(i, "givenName", e.target.value)} placeholder="First name" className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Surname *</label>
                            <input value={p.surName} onChange={(e) => changeField(i, "surName", e.target.value)} placeholder="Last name" className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Passport No *</label>
                            <input value={p.passport} onChange={(e) => changeField(i, "passport", e.target.value.toUpperCase())} placeholder="AA1234567" className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth</label>
                            <input type="date" value={p.dateOfBirth} onChange={(e) => changeField(i, "dateOfBirth", e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Passport Expiry</label>
                            <input type="date" value={p.passportExpiry} onChange={(e) => changeField(i, "passportExpiry", e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Nationality *</label>
                            <input value={p.nationality} onChange={(e) => changeField(i, "nationality", e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Passport File</label>
                            <input type="file" accept="image/*,.pdf" id={`file-${i}`} className="hidden" onChange={(e) => { if (e.target.files[0]) setPendingFiles((prev) => ({ ...prev, [i]: e.target.files[0] })); }} />
                            <label htmlFor={`file-${i}`} className={`flex items-center justify-center gap-1 w-full px-2 py-1.5 border rounded-lg text-xs cursor-pointer ${pendingFiles[i] ? "border-green-400 bg-green-50 text-green-700 font-semibold" : "border-slate-300 bg-white text-slate-500"}`}>
                              <Upload size={11} /> {pendingFiles[i] ? "âœ“ Ready" : "Upload"}
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => { setEditMode(false); setPendingFiles({}); }} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200">
                      Cancel
                    </button>
                    <button onClick={handleSavePassengers} disabled={saving} className="px-6 py-2 rounded-xl text-sm font-semibold text-white bg-[#3d6a8f] hover:bg-[#2d5a8f] disabled:opacity-60">
                      {saving ? "Savingâ€¦" : "Save Passengers"}
                    </button>
                  </div>
                </div>
              ) : passengers.length === 0 ? (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-800">
                  <p className="font-semibold">No passenger details yet</p>
                  <p className="mt-1">This booking was created without passenger information.{status === "pending" ? " Click \"Fill Passenger Details\" above to add them." : ""}</p>
                </div>
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

    {/* MRZ Modal */}
    {mrzModal.open && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setMrzModal({ open: false, index: null })}>
        <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="px-6 py-4 flex justify-between items-center" style={{ background: theme.colors.ublGradient }}>
            <h3 className="text-white font-bold text-lg">Scan Passport MRZ</h3>
            <button onClick={() => setMrzModal({ open: false, index: null })} className="text-white/80 hover:text-white"><AlertTriangle size={0} /><span className="text-xl">âœ•</span></button>
          </div>
          <div className="p-5">
            <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 flex items-center gap-2"><Scan size={14} /> Paste the 2-line MRZ from the passport.</p>
            <textarea value={mrzInput} onChange={(e) => { setMrzInput(e.target.value); setMrzError(""); }} rows={6} className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-mono resize-y focus:outline-none focus:border-blue-400" placeholder={"P<PAKDOE<<JOHN<<<<<<<\nAA1234567<0PAK..."} />
            {mrzError && <p className="text-red-600 text-xs mt-2">{mrzError}</p>}
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setMrzModal({ open: false, index: null })} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 border border-slate-200">Cancel</button>
              <button onClick={handleMrzParse} className="px-5 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2" style={{ background: theme.colors.ublGradient }}><Scan size={14} /> Parse MRZ</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
