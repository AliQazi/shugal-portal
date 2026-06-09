import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import axiosInstance from "../../Api/axios";
import { toast } from "react-toastify";

interface Hotel { _id: string; name: string; city: string; distance: number; rating: number; mapUrl: string; }
interface Transport { _id: string; route: string; transportType: string; }
interface Visa { _id: string; visaType: string; transport: string; currency: string; sellingPrice: number; }
interface GroupTicket { _id: string; groupName?: string; name?: string; seats?: number; }

interface HotelEntry {
  hotel: string; hotelName: string; supplier: string; city: string;
  distance: number; rating: number; checkIn: string; checkOut: string; nights: number; mapUrl: string;
}
interface TransportEntry { transport: string; route: string; supplier: string; transportType: string; }

const emptyHotel: HotelEntry = { hotel: "", hotelName: "", supplier: "", city: "", distance: 0, rating: 0, checkIn: "", checkOut: "", nights: 0, mapUrl: "" };
const emptyTransport: TransportEntry = { transport: "", route: "", supplier: "", transportType: "" };

const calcNights = (checkIn: string, checkOut: string): number => {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
};

export default function AddUmrahPackage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const logoRef = useRef<HTMLInputElement>(null);
  const flightLogoRef = useRef<HTMLInputElement>(null);

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [visas, setVisas] = useState<Visa[]>([]);
  const [groups, setGroups] = useState<GroupTicket[]>([]);

  const [packageName, setPackageName] = useState("");
  const [pnr, setPnr] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [flightLogoFile, setFlightLogoFile] = useState<File | null>(null);
  const [flightLogoPreview, setFlightLogoPreview] = useState("");
  const [umrahGroupTicket, setUmrahGroupTicket] = useState("");
  const [availablePackages, setAvailablePackages] = useState(0);
  const [packageDuration, setPackageDuration] = useState(0);
  const [hotelEntries, setHotelEntries] = useState<HotelEntry[]>([{ ...emptyHotel }]);
  const [transportEntries, setTransportEntries] = useState<TransportEntry[]>([{ ...emptyTransport }]);
  const [selectedVisa, setSelectedVisa] = useState("");
  const [roomTypes, setRoomTypes] = useState({ sharing: 0, quint: 0, quad: 0, triple: 0, double: 0, childWithoutPackage: 0, infantWithoutPackage: 0 });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      axiosInstance.get("/hotels"),
      axiosInstance.get("/transports"),
      axiosInstance.get("/visas"),
      axiosInstance.get("/group-ticketing"),
    ]).then(([h, t, v, g]) => {
      if (h.data.success) setHotels(h.data.data);
      if (t.data.success) setTransports(t.data.data);
      if (v.data.success) setVisas(v.data.data);
      const gData = g.data?.data || g.data || [];
      setGroups(Array.isArray(gData) ? gData : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (id) fetchPackage(id);
  }, [id]);

  const fetchPackage = async (pkgId: string) => {
    try {
      const res = await axiosInstance.get(`/umrah-packages/${pkgId}`);
      if (res.data.success) {
        const p = res.data.data;
        setPackageName(p.packageName || "");
        setPnr(p.pnr || "");
        setLogoPreview(p.logo || "");
        setFlightLogoPreview(p.flightLogo || "");
        setUmrahGroupTicket(p.umrahGroupTicket?._id || p.umrahGroupTicket || "");
        setAvailablePackages(p.availablePackages || 0);
        setPackageDuration(p.packageDuration || 0);
        setHotelEntries(p.hotels?.length ? p.hotels : [{ ...emptyHotel }]);
        setTransportEntries(p.transports?.length ? p.transports : [{ ...emptyTransport }]);
        setSelectedVisa(p.visa?._id || p.visa || "");
        setRoomTypes(p.roomTypes || roomTypes);
        setNotes(p.notes || "");
      }
    } catch { toast.error("Failed to load package"); }
  };

  // Hotel entry helpers
  const updateHotelEntry = (index: number, field: keyof HotelEntry, value: string | number) => {
    setHotelEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "checkIn" || field === "checkOut") {
        const ci = field === "checkIn" ? String(value) : updated[index].checkIn;
        const co = field === "checkOut" ? String(value) : updated[index].checkOut;
        updated[index].nights = calcNights(ci, co);
      }
      return updated;
    });
  };

  const selectHotel = (index: number, hotelId: string) => {
    const h = hotels.find((x) => x._id === hotelId);
    setHotelEntries((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        hotel: hotelId,
        hotelName: h?.name || "",
        city: h?.city || "",
        distance: h?.distance || 0,
        rating: h?.rating || 0,
        mapUrl: h?.mapUrl || "",
      };
      return updated;
    });
  };

  const addHotelEntry = () => setHotelEntries((prev) => [...prev, { ...emptyHotel }]);
  const removeHotelEntry = (index: number) => setHotelEntries((prev) => prev.filter((_, i) => i !== index));

  // Transport entry helpers
  const updateTransportEntry = (index: number, field: keyof TransportEntry, value: string) => {
    setTransportEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const selectTransport = (index: number, transportId: string) => {
    const t = transports.find((x) => x._id === transportId);
    setTransportEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], transport: transportId, route: t?.route || "", transportType: t?.transportType || "" };
      return updated;
    });
  };

  const addTransportEntry = () => setTransportEntries((prev) => [...prev, { ...emptyTransport }]);
  const removeTransportEntry = (index: number) => setTransportEntries((prev) => prev.filter((_, i) => i !== index));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "flightLogo") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (type === "logo") { setLogoFile(file); setLogoPreview(ev.target?.result as string); }
      else { setFlightLogoFile(file); setFlightLogoPreview(ev.target?.result as string); }
    };
    reader.readAsDataURL(file);
  };

  const buildFormData = () => {
    const fd = new FormData();
    const body = {
      packageName, pnr, umrahGroupTicket, availablePackages, packageDuration,
      hotels: hotelEntries, transports: transportEntries, visa: selectedVisa,
      roomTypes, notes,
    };
    fd.append("data", JSON.stringify(body));
    if (logoFile) fd.append("logo", logoFile);
    if (flightLogoFile) fd.append("flightLogo", flightLogoFile);
    return fd;
  };

  const handleSave = async (andCopy = false) => {
    if (!packageName.trim()) return toast.error("Package name is required");
    setSubmitting(true);
    try {
      const fd = buildFormData();
      let res;
      if (id) {
        res = await axiosInstance.put(`/umrah-packages/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        res = await axiosInstance.post("/umrah-packages", fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      if (res.data.success) {
        toast.success(id ? "Package updated!" : "Package created!");
        if (andCopy) {
          const txt = buildCopyText(res.data.data);
          await navigator.clipboard.writeText(txt).catch(() => {});
          toast.info("Copied to clipboard");
        }
        navigate("/umrah-packages");
      }
    } catch { toast.error("Save failed"); }
    finally { setSubmitting(false); }
  };

  const buildCopyText = (pkg: Record<string, unknown>) => {
    const rt = (pkg.roomTypes as typeof roomTypes) || roomTypes;
    return `*${pkg.packageName}*\nDuration: ${pkg.packageDuration} Days\nSharing: ${rt.sharing?.toLocaleString()} | Quint: ${rt.quint?.toLocaleString()} | Quad: ${rt.quad?.toLocaleString()} | Triple: ${rt.triple?.toLocaleString()} | Double: ${rt.double?.toLocaleString()}\n\nShaheen Wings Travels\nMobile: 0309-9802154\nWebsite: shaheenwingstravels.com`;
  };

  const inputCls = "border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";
  const labelCls = "text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{id ? "Edit" : "Add"} Umrah Package</h1>

      {/* Basic Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Package Name</label>
          <input value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="Enter package name" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>PNR</label>
          <input value={pnr} onChange={(e) => setPnr(e.target.value.toUpperCase())} placeholder="Enter PNR" className={inputCls} />
        </div>

        {/* Logo */}
        <div>
          <label className={labelCls}>Logo</label>
          <div
            onClick={() => logoRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-20 flex items-center justify-center cursor-pointer hover:border-blue-400 transition overflow-hidden"
          >
            {logoPreview ? <img src={logoPreview} alt="logo" className="h-full object-contain" /> : <span className="text-xs text-gray-400">Click to select</span>}
          </div>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, "logo")} />
        </div>

        {/* Flight Logo */}
        <div>
          <label className={labelCls}>Flight Logo</label>
          <div
            onClick={() => flightLogoRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-20 flex items-center justify-center cursor-pointer hover:border-blue-400 transition overflow-hidden"
          >
            {flightLogoPreview ? <img src={flightLogoPreview} alt="flight logo" className="h-full object-contain" /> : <span className="text-xs text-gray-400">Click to select</span>}
          </div>
          <input ref={flightLogoRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, "flightLogo")} />
        </div>
      </div>

      {/* Group Ticket + Counts */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-4">
        <div>
          <label className={labelCls}>Umrah Group Ticket</label>
          <select value={umrahGroupTicket} onChange={(e) => setUmrahGroupTicket(e.target.value)} className={inputCls}>
            <option value="">Select Umrah group</option>
            {groups.map((g) => (
              <option key={g._id} value={g._id}>{g.groupName || g.name || g._id}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Available Packages</label>
            <input type="number" min={0} value={availablePackages} onChange={(e) => setAvailablePackages(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Package Duration (Days)</label>
            <input type="number" min={0} value={packageDuration} onChange={(e) => setPackageDuration(Number(e.target.value))} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Hotels */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 dark:text-white">Hotels</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                {["Hotel Name", "Supplier", "City", "Distance (m)", "Rating", "Check In", "Check Out", "Nights", "Map URL", ""].map((h) => (
                  <th key={h} className="py-2 pr-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hotelEntries.map((entry, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 pr-3">
                    <select
                      value={entry.hotel}
                      onChange={(e) => selectHotel(i, e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Type hotel...</option>
                      {hotels.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-3"><input value={entry.supplier} onChange={(e) => updateHotelEntry(i, "supplier", e.target.value)} placeholder="Select supplier" className={inputCls} /></td>
                  <td className="py-2 pr-3"><input value={entry.city} onChange={(e) => updateHotelEntry(i, "city", e.target.value)} placeholder="City" className={inputCls} /></td>
                  <td className="py-2 pr-3"><input type="number" value={entry.distance} onChange={(e) => updateHotelEntry(i, "distance", Number(e.target.value))} className={inputCls} /></td>
                  <td className="py-2 pr-3"><input type="number" value={entry.rating} onChange={(e) => updateHotelEntry(i, "rating", Number(e.target.value))} min={0} max={5} step={0.5} className={inputCls} /></td>
                  <td className="py-2 pr-3"><input type="date" value={entry.checkIn} onChange={(e) => updateHotelEntry(i, "checkIn", e.target.value)} className={inputCls} /></td>
                  <td className="py-2 pr-3"><input type="date" value={entry.checkOut} onChange={(e) => updateHotelEntry(i, "checkOut", e.target.value)} className={inputCls} /></td>
                  <td className="py-2 pr-3"><input type="number" value={entry.nights} readOnly className={inputCls + " bg-gray-50 dark:bg-gray-600"} /></td>
                  <td className="py-2 pr-3"><input value={entry.mapUrl} onChange={(e) => updateHotelEntry(i, "mapUrl", e.target.value)} placeholder="Google Maps URL" className={inputCls} /></td>
                  <td className="py-2">
                    {hotelEntries.length > 1 && (
                      <button onClick={() => removeHotelEntry(i)} className="text-red-500 hover:text-red-700 font-bold text-lg leading-none">×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addHotelEntry} className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">
          + Add Hotel
        </button>
      </div>

      {/* Transport */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 dark:text-white">Transport</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                {["Route", "Supplier", "Transport Type", ""].map((h) => (
                  <th key={h} className="py-2 pr-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transportEntries.map((entry, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 pr-3">
                    <select
                      value={entry.transport}
                      onChange={(e) => selectTransport(i, e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Type route...</option>
                      {transports.map((t) => <option key={t._id} value={t._id}>{t.route}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-3"><input value={entry.supplier} onChange={(e) => updateTransportEntry(i, "supplier", e.target.value)} placeholder="Select supplier" className={inputCls} /></td>
                  <td className="py-2 pr-3">
                    <select value={entry.transportType} onChange={(e) => updateTransportEntry(i, "transportType", e.target.value)} className={inputCls}>
                      <option value="">Select type</option>
                      {["Bus", "GMC", "Car", "Van", "Coaster"].map((t) => <option key={t} value={t}>{t}</option>)}
                      {entry.transportType && !["Bus", "GMC", "Car", "Van", "Coaster"].includes(entry.transportType) && (
                        <option value={entry.transportType}>{entry.transportType}</option>
                      )}
                    </select>
                  </td>
                  <td className="py-2">
                    {transportEntries.length > 1 && (
                      <button onClick={() => removeTransportEntry(i)} className="text-red-500 hover:text-red-700 font-bold text-lg leading-none">×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addTransportEntry} className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">
          + Add Transport
        </button>
      </div>

      {/* Visa */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <label className="block text-sm font-semibold text-gray-800 dark:text-white mb-2">Select Visa *</label>
        <select value={selectedVisa} onChange={(e) => setSelectedVisa(e.target.value)} className={inputCls}>
          <option value="">Select visa...</option>
          {visas.map((v) => (
            <option key={v._id} value={v._id}>{v.visaType} — {v.transport === "with" ? "With" : "Without"} Transport ({v.currency} {v.sellingPrice.toLocaleString()})</option>
          ))}
        </select>
      </div>

      {/* Room Types */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Room Pricing</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(["sharing", "quint", "quad", "triple", "double"] as const).map((type) => (
            <div key={type}>
              <label className={labelCls + " capitalize"}>{type}</label>
              <input
                type="number"
                min={0}
                value={roomTypes[type]}
                onChange={(e) => setRoomTypes((prev) => ({ ...prev, [type]: Number(e.target.value) }))}
                className={inputCls}
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {(["childWithoutPackage", "infantWithoutPackage"] as const).map((type) => (
            <div key={type}>
              <label className={labelCls}>{type}</label>
              <input
                type="number"
                min={0}
                value={roomTypes[type]}
                onChange={(e) => setRoomTypes((prev) => ({ ...prev, [type]: Number(e.target.value) }))}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <label className="block text-sm font-semibold text-gray-800 dark:text-white mb-2">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Add any notes or special instructions..."
          className={inputCls + " resize-none"}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-8">
        <button
          onClick={() => handleSave(true)}
          disabled={submitting}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-60"
        >
          Save and Copy
        </button>
        <button
          onClick={() => handleSave(false)}
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-60"
        >
          {submitting ? "Saving..." : id ? "Update" : "Save"}
        </button>
      </div>
    </div>
  );
}
