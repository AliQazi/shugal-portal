import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import {
  X,
  Plus,
  Trash2,
  Scan,
  AlertTriangle,
  Upload,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import {
  FaPlaneDeparture,
  FaHotel,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaStar as FaStarIcon,
} from "react-icons/fa";
import { theme } from "../../../theme/theme";
import { createUmrahBooking } from "../../../api/umrahBookingApi";
import { parseMRZ } from "../../../utils/parseMRZ";
import { toast } from "react-toastify";

const getStoredBookingPackage = (search) => {
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

const getHotelsArray = (hotels) => {
  if (Array.isArray(hotels)) return hotels;
  if (!hotels || typeof hotels !== "object") return [];
  return Object.values(hotels).filter(Boolean);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d)) return "N/A";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const s = {
  label: { display: "block", marginBottom: "2px", fontSize: "0.68rem", fontWeight: 600, color: "#4a5568" },
  input: { width: "100%", padding: "5px 7px", border: "1px solid #cbd5e0", borderRadius: "5px", fontSize: "0.75rem", outline: "none", boxSizing: "border-box" },
  paxCard: { marginBottom: "12px", padding: "10px", border: "1.5px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc" },
  paxHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" },
  paxGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "6px", marginBottom: "6px" },
  warn: (bg) => ({
    display: "flex", alignItems: "center", gap: "4px", marginTop: "4px",
    padding: "4px 7px", borderRadius: "5px", background: bg,
    border: `1px solid ${bg === "#FEE2E2" ? "#FCA5A5" : "#FCD34D"}`,
  }),
  btn: (bg, disabled) => ({
    padding: "6px 12px", background: disabled ? "#cbd5e0" : bg, color: "white",
    border: "none", borderRadius: "6px", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", opacity: disabled ? 0.6 : 1,
  }),
  primary: { padding: "10px 20px", background: theme.colors.ublGradient, color: "white", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" },
  secondary: { padding: "8px 20px", background: "white", color: "#2d3748", border: "2px solid #e2e8f0", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.8rem" },
  textarea: { width: "100%", padding: "6px 8px", border: "1px solid #cbd5e0", borderRadius: "6px", fontSize: "0.75rem", outline: "none", minHeight: "50px", resize: "vertical", boxSizing: "border-box" },
  mrzModal: { background: "white", borderRadius: "16px", width: "100%", maxWidth: "580px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  mrzHeader: { padding: "18px 22px", background: theme.colors.ublGradient, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" },
  mrzBody: { padding: "22px" },
  mrzInfo: { background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "10px", padding: "11px 14px", marginBottom: "18px", display: "flex", gap: "10px" },
  mrzTa: { width: "100%", padding: "11px", border: "2px solid #e2e8f0", borderRadius: "10px", fontSize: "0.83rem", fontFamily: "monospace", resize: "vertical", outline: "none", background: "#F9FAFB" },
  mrzErr: { marginTop: "7px", padding: "9px 11px", background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: "8px", display: "flex", alignItems: "center", gap: "7px" },
  mrzBtns: { display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "18px", flexWrap: "wrap" },
  mrzCancel: { padding: "9px 18px", background: "white", color: "#4B5563", border: "2px solid #E5E7EB", borderRadius: "8px", fontWeight: 600, cursor: "pointer" },
  mrzParse: { padding: "9px 22px", background: theme.colors.ublGradient, color: "white", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "7px" },
  closeBtn: { background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white" },
};

const ROOM_ORDER = ["sharing", "quint", "quad", "triple", "double"];
const ROOM_OCCUPANCY = { double: 2, triple: 3, quad: 4, quint: 5 };

const mkAdult  = () => ({ type: "Adult",  title: "Mr",    givenName: "", surName: "", passport: "", dateOfBirth: "", passportExpiry: "", nationality: "Pakistan", passportFile: null, passportFileName: "" });
const mkChild  = () => ({ type: "Child",  title: "Child", givenName: "", surName: "", passport: "", dateOfBirth: "", passportExpiry: "", nationality: "Pakistan", passportFile: null, passportFileName: "" });
const mkInfant = () => ({ type: "Infant", title: "INF",   givenName: "", surName: "", passport: "", dateOfBirth: "", passportExpiry: "", nationality: "Pakistan", passportFile: null, passportFileName: "" });

export default function UmrahBookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const packageData  = location.state?.packageData || getStoredBookingPackage(location.search);
  const roomPrices = packageData?.rooms || {};
  const availableRoomTypes = ROOM_ORDER.filter((r) => Number(roomPrices[r]) > 0);
  const [selectedRoom, setSelectedRoom] = useState(
    location.state?.selectedRoom || availableRoomTypes[0] || "sharing",
  );
  const pricePerPerson =
    Number(roomPrices[selectedRoom]) || location.state?.pricePerPerson || 0;

  const isAbidAirPackage =
    String(packageData?.source || packageData?.packageSource || "").toLowerCase() ===
    "abidairtravel";
  const packageId =
    packageData?.id || packageData?.packageId || packageData?.package_id || packageData?._id;

  const [loading, setLoading] = useState(false);
  const [mrzModal, setMrzModal] = useState({ open: false, index: null, type: "adult" });
  const [mrzInput, setMrzInput] = useState("");
  const [mrzError, setMrzError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const isSharing = selectedRoom?.toLowerCase() === "sharing";
  const maxAdults =
    ROOM_OCCUPANCY[selectedRoom?.toLowerCase()] || packageData?.availableRooms || 2;

  const [formData, setFormData] = useState({
    adults:   Array(isSharing ? 2 : maxAdults).fill(null).map(mkAdult),
    children: [],
    infants:  [],
    specialRequests: "",
  });

  const changeRoom = (room) => {
    if (room === selectedRoom) return;
    setSelectedRoom(room);
    const occupancy = ROOM_OCCUPANCY[room];
    if (!occupancy) return;
    setFormData((f) => ({
      ...f,
      adults: Array.from({ length: occupancy }, (_, i) => f.adults[i] || mkAdult()),
    }));
  };

  // Abid Air package stock is seat-based; infants do not occupy seats, so only
  // adult/child changes are checked against live availability.
  const availabilityRequestRef = useRef(0);

  useEffect(() => {
    if (!isAbidAirPackage || !packageId) return;

    const adults = formData.adults.length;
    const children = formData.children.length;
    if (adults + children === 0) return;

    const requestId = ++availabilityRequestRef.current;
    const timer = setTimeout(async () => {
      try {
        const response = await axiosInstance.get(
          `/abidair/package/${packageId}/availability`,
          { params: { adults, children, infants: 0 } },
        );
        if (requestId !== availabilityRequestRef.current) return;

        if (!response.data?.available) {
          toast.error(response.data?.message || "Seats not available.", {
            toastId: "umrah-package-availability",
          });
          return;
        }
        toast.success(response.data?.message || "Seats are available.", {
          toastId: "umrah-package-availability",
        });
      } catch (error) {
        if (requestId !== availabilityRequestRef.current) return;
        toast.error(
          error.response?.data?.message || "Unable to check seat availability.",
          { toastId: "umrah-package-availability" },
        );
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    formData.adults.length,
    formData.children.length,
    isAbidAirPackage,
    packageId,
  ]);

  const changeField = (listKey, i, field, val) => {
    setFormData((f) => {
      const list = [...f[listKey]];
      list[i] = { ...list[i], [field]: val };
      return { ...f, [listKey]: list };
    });
  };

  const handlePassportUpload = (listKey, i, file) => {
    if (!file) return;
    setFormData((f) => {
      const list = [...f[listKey]];
      list[i] = { ...list[i], passportFile: file, passportFileName: file.name };
      return { ...f, [listKey]: list };
    });
  };

  const addAdult = () => {
    if (!(isAbidAirPackage && isSharing) && formData.adults.length >= maxAdults) {
      toast.warning(isSharing ? `Max ${maxAdults} adults (available rooms)` : `${selectedRoom} allows ${maxAdults} adult(s)`);
    }
    setFormData((f) => ({ ...f, adults: [...f.adults, mkAdult()] }));
  };

  const removeAdult = (i) => {
    if (!isSharing) { toast.warning(`${selectedRoom} requires exactly ${maxAdults} adults`); return; }
    if (formData.adults.length > 1) setFormData((f) => ({ ...f, adults: f.adults.filter((_, x) => x !== i) }));
  };

  const checkExpiry = (d) => {
    if (!d) return null;
    const exp = new Date(d), today = new Date(), soon = new Date();
    soon.setMonth(today.getMonth() + 7);
    if (exp < today) return { type: "expired", message: "Passport has expired" };
    if (exp <= soon) return { type: "warning", message: "Passport expires within 7 months – may not be eligible for visa" };
    return null;
  };

  const fmtDate = (d) => (d instanceof Date && !isNaN(d) ? d.toISOString().split("T")[0] : "");

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
    if (!results.length) { setMrzError("Invalid MRZ. Paste the complete 2-line MRZ from the passport."); return; }

    const { index: si, type } = mrzModal;
    const listKey = type === "infant" ? "infants" : type === "child" ? "children" : "adults";

    setFormData((prev) => {
      const list = [...prev[listKey]];
      results.forEach((r, offset) => {
        const idx = si + offset;
        if (idx >= list.length) return;
        list[idx] = {
          ...list[idx],
          surName:        r.surName        || list[idx].surName,
          givenName:      r.givenName      || list[idx].givenName,
          passport:       r.passport       || list[idx].passport,
          nationality:    r.nationality    || list[idx].nationality,
          dateOfBirth:    fmtDate(r.dateOfBirth)    || list[idx].dateOfBirth,
          passportExpiry: fmtDate(r.passportExpiry) || list[idx].passportExpiry,
          title:          r.title          || list[idx].title,
        };
      });
      return { ...prev, [listKey]: list };
    });

    toast.success(`${results.length} passport(s) scanned!`);
    setMrzModal({ open: false, index: null, type: "adult" });
    setMrzInput("");
    setMrzError("");
  };

  const totalPrice = () => {
    const a = formData.adults.length * (pricePerPerson || 0);
    const c = formData.children.length * (packageData?.rooms?.childWithoutPackage || 0);
    const inf = formData.infants.length * (packageData?.rooms?.InfantWithoutPackage || 0);
    return a + c + inf;
  };

  const getAllPassengers = () => [...formData.adults, ...formData.children, ...formData.infants];

  const allPassengersEmpty = () =>
    getAllPassengers().every((p) => !p.givenName && !p.surName && !p.passport);

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const confirmAndSubmit = async () => {
    setShowConfirmation(false);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("packageId", packageData?._id || packageData?.id || "");
      fd.append("packageName", packageData?.packageName || "Umrah Package");
      fd.append(
        "packageSource",
        packageData?.source || packageData?.packageSource || "local",
      );
      fd.append("pnr", packageData?.pnr || packageData?.flights?.[0]?.pnr || "");
      fd.append("roomType", selectedRoom);
      // Server-issued price snapshot: lets the backend recover the true supplier
      // price and re-check that the package is still visible to agents
      if (packageData?.marginToken) fd.append("marginToken", packageData.marginToken);
      fd.append("specialRequests", formData.specialRequests);
      fd.append("pricing", JSON.stringify({
        pricePerPerson: Number(pricePerPerson || 0),
        currency: "PKR",
        totalAmount: totalPrice(),
      }));
      fd.append("packageData", JSON.stringify(packageData));
      fd.append("adultsCount", String(formData.adults.length));
      fd.append("childrenCount", String(formData.children.length));
      fd.append("infantsCount", String(formData.infants.length));

      // If all passengers are empty, book without passenger details (fill later)
      const passengersToSend = allPassengersEmpty() ? [] : getAllPassengers();
      fd.append("passengers", JSON.stringify(passengersToSend));

      if (!allPassengersEmpty()) {
        getAllPassengers().forEach((p, i) => {
          if (p.passportFile) fd.append(`passportFile_${i}`, p.passportFile, `pax-${i}-${p.passportFile.name}`);
        });
      }

      const res = await createUmrahBooking(fd);
      if (res.success) {
        toast.success("Booking submitted! Booking#: " + res.data.bookingNumber);
        setTimeout(() => navigate("/dashboard/umrah-package-bookings"), 1200);
      }
    } catch (err) {
      toast.error("Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const renderPaxFields = (pax, i, type, listKey, onRemove) => {
    const expWarn   = checkExpiry(pax.passportExpiry);
    const titleOpts = type === "adult" ? ["Mr", "Mrs", "Ms", "Miss", "Dr"] : type === "child" ? ["Child"] : ["INF"];
    const canRemove = type === "adult" ? isSharing : true;
    const color     = type === "child" ? "#3B82F6" : type === "infant" ? "#8B5CF6" : "#2d3748";
    return (
      <div key={`${type}-${i}`} style={{ ...s.paxCard, borderColor: type !== "adult" ? color : "#e2e8f0" }}>
        <div style={s.paxHeader}>
          <h4 style={{ margin: 0, color, fontWeight: 600, fontSize: "0.85rem" }}>
            {type.charAt(0).toUpperCase() + type.slice(1)} {i + 1}
          </h4>
          <div style={{ display: "flex", gap: "6px" }}>
            <button type="button" onClick={() => { setMrzModal({ open: true, index: i, type }); setMrzInput(""); setMrzError(""); }} style={s.btn("#3B82F6")}>
              <Scan size={12} /> MRZ
            </button>
            {canRemove && (
              <button type="button" onClick={() => onRemove(i)} style={s.btn("#f56565")}>
                <Trash2 size={12} /> Remove
              </button>
            )}
          </div>
        </div>
        <div style={s.paxGrid}>
          {[
            { label: "Title",       key: "title",         type: "select", opts: titleOpts },
            { label: "Given Name",  key: "givenName",     type: "text",   placeholder: "First name" },
            { label: "Surname",     key: "surName",       type: "text",   placeholder: "Last name" },
            { label: "Passport",    key: "passport",      type: "text",   placeholder: "AA1234567" },
            { label: "DOB",         key: "dateOfBirth",   type: "date" },
            { label: "Nationality", key: "nationality",   type: "text" },
            { label: "Expiry",      key: "passportExpiry",type: "date" },
          ].map(({ label, key, type: inputType, opts, placeholder }) => (
            <div key={key}>
              <label style={s.label}>{label}</label>
              {inputType === "select" ? (
                <select value={pax[key]} onChange={(e) => changeField(listKey, i, key, e.target.value)} style={s.input}>
                  {opts.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={inputType} value={pax[key]} placeholder={placeholder}
                  onChange={(e) => changeField(listKey, i, key, key === "passport" ? e.target.value.toUpperCase() : e.target.value)}
                  style={s.input}
                />
              )}
            </div>
          ))}
          <div>
            <label style={s.label}>Passport File *</label>
            <input type="file" accept="image/*,.pdf" onChange={(e) => handlePassportUpload(listKey, i, e.target.files[0])} style={{ display: "none" }} id={`pu-${type}-${i}`} />
            <label htmlFor={`pu-${type}-${i}`} style={{ ...s.input, display: "flex", alignItems: "center", justifyContent: "center", gap: "3px", cursor: "pointer", color: pax.passportFileName ? "#166534" : "#718096", background: pax.passportFileName ? "#F0FDF4" : "white", border: pax.passportFileName ? "1px solid #86EFAC" : "1px solid #cbd5e0", fontWeight: pax.passportFileName ? 600 : 400 }}>
              <Upload size={11} /> {pax.passportFileName ? "✓ Uploaded" : "Upload"}
            </label>
          </div>
        </div>
        {expWarn && (
          <div style={s.warn(expWarn.type === "expired" ? "#FEE2E2" : "#FEF3C7")}>
            <AlertTriangle size={10} color={expWarn.type === "expired" ? "#DC2626" : "#D97706"} />
            <span style={{ fontSize: "0.65rem", color: expWarn.type === "expired" ? "#DC2626" : "#D97706", fontWeight: 500 }}>{expWarn.message}</span>
          </div>
        )}
      </div>
    );
  };

  if (!packageData) {
    return (
      <div style={{ padding: "100px", textAlign: "center", color: "#718096" }}>
        <h2>No package data found.</h2>
        <button onClick={() => navigate(-1)} style={{ ...s.secondary, marginTop: "20px" }}>Go Back</button>
      </div>
    );
  }

  const flights       = packageData?.flights || [];
  const hotels        = getHotelsArray(packageData?.hotels);
  const pkgName       = packageData?.packageName || "Umrah Package";

  const hotelsByCity  = {};
  hotels.forEach((h) => { const c = h?.city || "Other"; if (!hotelsByCity[c]) hotelsByCity[c] = []; hotelsByCity[c].push(h); });

  return (
    <div style={{ backgroundColor: "#f4f7fe", minHeight: "100vh", padding: "30px 20px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

        {/* ── HEADER ── */}
        <div style={{ background: theme.colors.ublGradient, borderRadius: "20px", padding: "40px 30px", color: "white", marginBottom: "30px", boxShadow: "0 10px 20px rgba(0,0,0,0.08)", textAlign: "center", position: "relative" }}>
          <button onClick={() => navigate(-1)} style={{ position: "absolute", top: "20px", left: "20px", ...s.closeBtn, width: "auto", padding: "10px 20px", borderRadius: "10px", display: "flex", gap: "8px" }}>
            <ArrowLeft size={20} /> Back
          </button>
          <h1 style={{ margin: "0 0 8px 0", fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.5px" }}>{pkgName}</h1>
          <p style={{ margin: "0 0 30px 0", opacity: 0.9, fontSize: "1rem" }}>Complete your booking details below</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "20px", maxWidth: "900px", margin: "0 auto", padding: "25px", background: "rgba(255,255,255,0.15)", borderRadius: "15px", backdropFilter: "blur(10px)" }}>
            {[
              {
                value: isAbidAirPackage ? "On Call" : packageData.availableRooms,
                label: isAbidAirPackage ? "Seats" : "Available Packages",
              },
              { value: packageData.packageDuration ? `${packageData.packageDuration} Days` : "N/A", label: "Duration" },
              { value: selectedRoom, label: "Accommodation" },
              { value: `PKR ${pricePerPerson?.toLocaleString()}`, label: "Per Person" },
            ].map(({ value, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "5px", textTransform: "capitalize" }}>{value}</div>
                <div style={{ fontSize: "0.8rem", opacity: 0.9, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PACKAGE DETAILS CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "20px", marginBottom: "30px", alignItems: "start" }}>

          {/* Flights */}
          <div style={{ background: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: "0 0 18px 0", fontSize: "1.2rem", color: "#1a202c", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
              <FaPlaneDeparture color="#21397C" /> Flight Details
            </h3>
            {flights.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "15px" }}>
                {flights.map((flight, idx) => (
                  <div key={idx} style={{ padding: "14px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", marginBottom: "8px" }}>
                      {idx === 0 ? "Departure" : "Return"}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", gap: "10px" }}>
                      <span style={{ fontWeight: 700, color: "#2d3748" }}>{formatDate(flight.depDate)}</span>
                      <span style={{ fontSize: "0.75rem", background: "#edf2f7", padding: "4px 10px", borderRadius: "6px", fontWeight: 600 }}>{flight.flightNo}</span>
                    </div>
                    <div style={{ fontSize: "0.88rem", color: "#4a5568", marginBottom: "8px" }}>
                      {flight.depTime} • {flight.sectorFrom} → {flight.sectorTo}
                    </div>
                    {flight.arrDate && (
                      <div style={{ fontSize: "0.82rem", color: "#718096", marginTop: "5px" }}>Arrival: {formatDate(flight.arrDate)} {flight.arrTime}</div>
                    )}
                    <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                      {flight.flightClass && <span style={{ fontSize: "0.7rem", background: "#EFF6FF", color: "#1E40AF", padding: "3px 8px", borderRadius: "5px", fontWeight: 600 }}>{flight.flightClass}</span>}
                      {flight.baggage     && <span style={{ fontSize: "0.7rem", background: "#F0FDF4", color: "#166534", padding: "3px 8px", borderRadius: "5px", fontWeight: 600 }}>{flight.baggage}kg</span>}
                      {flight.meal        && <span style={{ fontSize: "0.7rem", background: "#FEF3C7", color: "#92400E", padding: "3px 8px", borderRadius: "5px", fontWeight: 600 }}>Meal: {flight.meal}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#718096" }}>No flight information available</p>
            )}
          </div>

          {/* Hotels */}
          <div style={{ background: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: "0 0 18px 0", fontSize: "1.2rem", color: "#1a202c", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
              <FaHotel color="#21397C" /> Accommodation
            </h3>
            {Object.keys(hotelsByCity).length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
                {Object.entries(hotelsByCity).map(([city, ch]) =>
                  ch.map((hotel, idx) => {
                    const cl = city.toLowerCase();
                    const cityImg = cl.includes("makkah") || cl.includes("mecca")
                      ? "https://www.mtctutorials.com/wp-content/uploads/2022/06/Kaaba-High-Quality-PNG-Image-1.png"
                      : cl.includes("madin") || cl.includes("medina")
                      ? "https://png.pngtree.com/png-clipart/20220616/original/pngtree-prophet-mohammad-madina-or-madinah-nabawi-mosque-masjid-milad-un-nabi-png-image_8081426.png"
                      : "https://static.vecteezy.com/system/resources/previews/024/160/410/non_2x/blank-board-with-shop-store-building-icon-in-peach-and-white-color-vector.jpg";
                    return (
                      <div key={hotel._id || `${city}-${idx}`} style={{ padding: "14px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                          <img src={cityImg} alt={city} style={{ height: 40, width: 40, objectFit: "contain" }} />
                          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#2d3748" }}>{city}</h4>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "8px", color: "#2d3748" }}>
                          {hotel.hotelName || hotel.name || "Hotel"}
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", fontSize: "0.8rem", color: "#718096" }}>
                          {hotel.distance > 0 && (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", background: "#fff", padding: "4px 8px", borderRadius: "8px" }}>
                              <FaMapMarkerAlt /> {hotel.distance}m
                            </span>
                          )}
                          {hotel.rating > 0 && (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", background: "#fff", padding: "4px 8px", borderRadius: "8px" }}>
                              <FaStarIcon color="#ecc94b" /> {hotel.rating}.0
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <p style={{ color: "#718096" }}>No accommodation information available</p>
            )}
          </div>

          {/* Transport */}
          {packageData?.transports?.length > 0 && (
            <div style={{ background: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 18px 0", fontSize: "1.2rem", color: "#1a202c", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                <FaCheckCircle color="#21397C" /> Transport
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
                {packageData.transports.map((t, i) => (
                  <div key={i} style={{ padding: "14px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "8px", color: "#2d3748" }}>{t.route}</div>
                    <div style={{ fontSize: "0.8rem", color: "#718096" }}><strong style={{ color: "#4a5568" }}>Type:</strong> {t.transportType}</div>
                    <div style={{ fontSize: "0.8rem", color: "#718096" }}><strong style={{ color: "#4a5568" }}>Supplier:</strong> {t.supplier}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── BOOKING FORM ── */}
        <form onSubmit={handleSubmit}>
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", marginBottom: "20px" }}>

            {/* Room type */}
            {availableRoomTypes.length > 0 && (
              <div style={{ marginBottom: "18px" }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: "#1a202c", fontWeight: 700 }}>Room Type</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                  {availableRoomTypes.map((room) => (
                    <button
                      key={room}
                      type="button"
                      onClick={() => changeRoom(room)}
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        border: `2px solid ${selectedRoom === room ? "#21397C" : "#e2e8f0"}`,
                        background: selectedRoom === room ? "#f0f7ff" : "white",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#718096", fontWeight: 700 }}>
                        {room}{ROOM_OCCUPANCY[room] ? ` (${ROOM_OCCUPANCY[room]} pax)` : ""}
                      </div>
                      <div style={{ fontWeight: 700, color: "#2d3748", fontSize: "0.9rem" }}>
                        PKR {Number(roomPrices[room]).toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Adults */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1a202c", fontWeight: 700 }}>
                Adult Passengers ({formData.adults.length})
                <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#718096", marginLeft: "8px" }}>
                  ({isSharing
                    ? isAbidAirPackage
                      ? "Seats on call - availability checked live"
                      : `Max: ${maxAdults} based on available rooms`
                    : `${selectedRoom}: ${maxAdults} required`})
                </span>
              </h3>
              <button type="button" onClick={addAdult} style={s.btn("#48bb78", false)}>
                <Plus size={13} /> Add Adult
              </button>
            </div>
            {formData.adults.map((pax, i) => renderPaxFields(pax, i, "adult", "adults", removeAdult))}

            {/* Children / Infants */}
            <div style={{ marginTop: "25px", paddingTop: "20px", borderTop: "2px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#1a202c", fontWeight: 700 }}>Add Child / Infant</h3>
              <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
                <button type="button" onClick={() => setFormData((f) => ({ ...f, children: [...f.children, mkChild()] }))} style={s.btn("#3B82F6")}>
                  <Plus size={13} /> Child (PKR {(packageData?.rooms?.childWithoutPackage || 0).toLocaleString()})
                </button>
                <button type="button" onClick={() => setFormData((f) => ({ ...f, infants: [...f.infants, mkInfant()] }))} style={s.btn("#8B5CF6")}>
                  <Plus size={13} /> Infant (PKR {(packageData?.rooms?.InfantWithoutPackage || 0).toLocaleString()})
                </button>
              </div>
              {formData.children.map((pax, i) => renderPaxFields(pax, i, "child", "children", (x) => setFormData((f) => ({ ...f, children: f.children.filter((_, j) => j !== x) }))))}
              {formData.infants.map( (pax, i) => renderPaxFields(pax, i, "infant","infants",  (x) => setFormData((f) => ({ ...f, infants:  f.infants.filter( (_, j) => j !== x) }))))}
            </div>

            {/* Special Requests */}
            <div style={{ marginTop: "15px" }}>
              <label style={{ ...s.label, fontSize: "0.75rem", marginBottom: "4px" }}>Special Requests (Optional)</label>
              <textarea value={formData.specialRequests} onChange={(e) => setFormData((f) => ({ ...f, specialRequests: e.target.value }))} style={s.textarea} placeholder="Any special requests or notes..." />
            </div>
          </div>

          {/* ── SUMMARY ── */}
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem", color: "#1a202c", fontWeight: 700, borderBottom: "1.5px solid #e2e8f0", paddingBottom: "10px" }}>Package Summary</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Package:",   value: pkgName,      caps: true },
                { label: "Room Type:", value: selectedRoom, caps: true },
                { label: "Adult Price:", value: `PKR ${pricePerPerson?.toLocaleString()}` },
                ...(formData.children.length ? [{ label: "Child Price:", value: `PKR ${(packageData?.rooms?.childWithoutPackage || 0).toLocaleString()}` }] : []),
                ...(formData.infants.length  ? [{ label: "Infant Price:", value: `PKR ${(packageData?.rooms?.InfantWithoutPackage || 0).toLocaleString()}` }] : []),
                { label: "Total Passengers:", value: formData.adults.length + formData.children.length + formData.infants.length },
              ].map(({ label, value, caps }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "0.8rem", color: "#4a5568" }}>
                  <span>{label}</span>
                  <strong style={{ textTransform: caps ? "capitalize" : "none" }}>{value}</strong>
                </div>
              ))}

              {/* Passenger list */}
              <div style={{ marginTop: "8px", padding: "10px", background: "#f8fafc", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "0.8rem", fontWeight: 700, color: "#2d3748" }}>Passengers</h4>
                {getAllPassengers().map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "0.75rem", color: "#718096" }}>
                    <div>
                      <strong style={{ color: p.type === "Child" ? "#3B82F6" : p.type === "Infant" ? "#8B5CF6" : "#2d3748" }}>
                        {i + 1}. {p.title}. {p.givenName} {p.surName}
                      </strong>
                      <div style={{ fontSize: "0.68rem", marginTop: "1px" }}>{p.type} | Passport: {p.passport || "Not provided"}</div>
                    </div>
                    <strong style={{ whiteSpace: "nowrap", color: "#2d3748" }}>
                      PKR {(p.type === "Infant" ? packageData?.rooms?.InfantWithoutPackage : p.type === "Child" ? packageData?.rooms?.childWithoutPackage : pricePerPerson || 0)?.toLocaleString()}
                    </strong>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: "10px", borderTop: "1.5px solid #e2e8f0" }}>
                <span style={{ fontSize: "1rem", fontWeight: 600 }}>Total Amount:</span>
                <strong style={{ fontSize: "1.3rem", color: theme.colors.success, fontWeight: 800 }}>PKR {totalPrice().toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            <button type="button" onClick={() => navigate(-1)} style={s.secondary}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...s.primary, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Submitting…" : "Confirm Booking"}
            </button>
          </div>
        </form>
      </div>

      {/* ── MRZ MODAL ── */}
      {mrzModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }} onClick={() => setMrzModal({ open: false, index: null, type: "adult" })}>
          <div style={s.mrzModal} onClick={(e) => e.stopPropagation()}>
            <div style={s.mrzHeader}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Scan Passport MRZ</h3>
              <button onClick={() => setMrzModal({ open: false, index: null, type: "adult" })} style={s.closeBtn}><X size={20} /></button>
            </div>
            <div style={s.mrzBody}>
              <div style={s.mrzInfo}>
                <Scan size={18} color="#3B82F6" />
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#1E40AF" }}>Paste the 2-line MRZ code. Separate multiple passports with a blank line.</p>
              </div>
              <textarea value={mrzInput} onChange={(e) => { setMrzInput(e.target.value); setMrzError(""); }} placeholder="P<PAKDOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<&#10;AA1234567<0PAK8901015M3012319<<<<<<<<<<<<08" style={s.mrzTa} rows={8} />
              {mrzError && (
                <div style={s.mrzErr}>
                  <AlertTriangle size={14} color="#DC2626" />
                  <span style={{ fontSize: "0.8rem", color: "#DC2626" }}>{mrzError}</span>
                </div>
              )}
              <div style={s.mrzBtns}>
                <button onClick={() => setMrzModal({ open: false, index: null, type: "adult" })} style={s.mrzCancel}>Cancel</button>
                <button onClick={handleMrzParse} style={s.mrzParse}><Scan size={16} /> Parse MRZ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM MODAL ── */}
      {showConfirmation && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }} onClick={() => setShowConfirmation(false)}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "550px", overflow: "hidden", boxShadow: "0 25px 50px rgba(0,0,0,0.3)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "25px 30px", background: allPassengersEmpty() ? "#92400E" : theme.colors.ublGradient, color: "white", textAlign: "center" }}>
              <CheckCircle size={48} style={{ marginBottom: "10px" }} />
              <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>
                {allPassengersEmpty() ? "Book Without Passenger Details?" : "Confirm Your Booking"}
              </h3>
            </div>
            <div style={{ padding: "30px" }}>
              {allPassengersEmpty() && (
                <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: "10px", padding: "14px 16px", marginBottom: "20px", fontSize: "0.85rem", color: "#92400E" }}>
                  <strong>⚠ Passenger details are incomplete.</strong>
                  <p style={{ margin: "6px 0 0 0" }}>The booking will be created with seats reserved but no passenger information. You can fill in passenger details later from <strong>My Umrah Package Bookings</strong>.</p>
                </div>
              )}
              <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", marginBottom: "25px" }}>
                {[
                  { label: "Package:", value: pkgName },
                  { label: "Room Type:", value: selectedRoom },
                  { label: "Total Passengers:", value: `${formData.adults.length + formData.children.length + formData.infants.length} (${formData.adults.length} Adults${formData.children.length ? `, ${formData.children.length} Children` : ""}${formData.infants.length ? `, ${formData.infants.length} Infants` : ""})` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ color: "#718096" }}>{label}</span>
                    <strong style={{ color: "#2d3748", textTransform: "capitalize" }}>{value}</strong>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "15px", marginTop: "15px", borderTop: "2px solid #e2e8f0" }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#2d3748" }}>Total Amount:</span>
                  <strong style={{ fontSize: "1.3rem", color: theme.colors.success, fontWeight: 800 }}>PKR {totalPrice().toLocaleString()}</strong>
                </div>
              </div>
              <p style={{ margin: "0 0 25px 0", fontSize: "0.9rem", color: "#718096", textAlign: "center" }}>
                {allPassengersEmpty()
                  ? "Booking Without Details."
                  : "By confirming you agree that all information provided is correct."}
              </p>
              <div style={{ display: "flex", gap: "15px" }}>
                <button onClick={() => setShowConfirmation(false)} style={{ flex: 1, padding: "12px", background: "white", color: "#4a5568", border: "2px solid #e2e8f0", borderRadius: "10px", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" }}>
                  Cancel
                </button>
                <button onClick={confirmAndSubmit} style={{ flex: 1, padding: "12px", background: theme.colors.ublGradient, color: "white", border: "none", borderRadius: "10px", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" }}>
                  Confirm & Book
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
