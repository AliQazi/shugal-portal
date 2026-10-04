import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import axiosInstance from "../../Api/axios";
import { toast } from "react-toastify";
import { companyContact, getCurrentWebsite } from "../../data/companyContact";

interface Hotel { _id: string; name: string; city: string; distance: number; rating: number; mapUrl: string; }
interface Transport { _id: string; route: string; transportType: string; }
interface Visa { _id: string; visaType: string; transport: string; currency: string; sellingPrice: number; }
interface Airline { _id: string; airlineName: string; shortCode: string; logo: string; }

interface HotelEntry {
  hotel: string; hotelName: string; supplier: string; city: string;
  distance: number; rating: number; checkIn: string; checkOut: string; nights: number; mapUrl: string;
}
interface TransportEntry { transport: string; route: string; supplier: string; transportType: string; }
interface FlightEntry {
  airline: string; flightNo: string; depDate: string; depTime: string; arrDate: string; arrTime: string;
  sectorFrom: string; sectorTo: string; fromTerminal: string; toTerminal: string; flightClass: string; baggage: string; meal: string;
}

const emptyHotel: HotelEntry = { hotel: "", hotelName: "", supplier: "", city: "", distance: 0, rating: 0, checkIn: "", checkOut: "", nights: 0, mapUrl: "" };
const emptyTransport: TransportEntry = { transport: "", route: "", supplier: "", transportType: "" };
const emptyFlight: FlightEntry = {
  airline: "", flightNo: "", depDate: "", depTime: "", arrDate: "", arrTime: "",
  sectorFrom: "", sectorTo: "", fromTerminal: "", toTerminal: "", flightClass: "", baggage: "", meal: "",
};

const calcNights = (checkIn: string, checkOut: string): number => {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
};

const formatDateInput = (value?: string) => {
  if (!value) return "";
  return value.slice(0, 10);
};

const formatSectorInput = (value: string) => {
  const letters = value.toUpperCase().replace(/[^A-Z]/g, "");
  return letters.match(/.{1,3}/g)?.join("-") || "";
};

export default function AddUmrahPackage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const logoRef = useRef<HTMLInputElement>(null);

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [visas, setVisas] = useState<Visa[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);

  const [packageName, setPackageName] = useState("");
  const [pnr, setPnr] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
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

  const [groupForm, setGroupForm] = useState({
    user: "",
    evoucherAccount: "",
    sector: "",
    airline: "",
    groupCategory: "Umrah Groups",
    groupName: "",
    totalSeats: 0,
    days: 0,
    showSeat: false,
    groupType: "Umrah Groups",
    flights: [{ ...emptyFlight }],
    passengers: { adults: 0, children: 0, infants: 0 },
    price: {
      sellingCurrencyB2B: "PKR",
      sellingAdultPriceB2B: 0,
      sellingChildPriceB2B: 0,
      sellingInfantPriceB2B: 0,
    },
    contactPersonPhone: "",
    contactPersonEmail: "",
    internalStatus: "Public",
  });

  const selectedAirline = useMemo(
    () => airlines.find((a) => a.airlineName === groupForm.airline),
    [airlines, groupForm.airline]
  );

  useEffect(() => {
    Promise.all([
      axiosInstance.get("/hotels"),
      axiosInstance.get("/transports"),
      axiosInstance.get("/visas"),
      axiosInstance.get("/airline"),
    ]).then(([h, t, v, a]) => {
      if (h.data.success) setHotels(h.data.data);
      if (t.data.success) setTransports(t.data.data);
      if (v.data.success) setVisas(v.data.data);
      if (a.data.success) setAirlines(a.data.data);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (id) fetchPackage(id);
  }, [id]);

  useEffect(() => {
    if (selectedAirline?.logo) setFlightLogoPreview(selectedAirline.logo);
  }, [selectedAirline]);

  const fetchPackage = async (pkgId: string) => {
    try {
      const res = await axiosInstance.get(`/umrah-packages/${pkgId}`);
      if (res.data.success) {
        const p = res.data.data;
        const linkedGroup = p.umrahGroupTicket || {};
        const packageGroup = Array.isArray(p.flights) && p.flights.length ? p : linkedGroup;
        const flights = Array.isArray(packageGroup.flights) && packageGroup.flights.length
          ? packageGroup.flights.map((f: Partial<FlightEntry>) => ({ ...emptyFlight, ...f, depDate: formatDateInput(f.depDate), arrDate: formatDateInput(f.arrDate) }))
          : [{ ...emptyFlight }];

        setPackageName(p.packageName || "");
        setPnr(p.pnr || packageGroup.pnr || "");
        setLogoPreview(p.logo || "");
        setFlightLogoPreview(p.flightLogo || "");
        setUmrahGroupTicket(linkedGroup._id || p.umrahGroupTicket || "");
        setAvailablePackages(p.availablePackages || 0);
        setPackageDuration(p.packageDuration || 0);
        setHotelEntries(p.hotels?.length ? p.hotels : [{ ...emptyHotel }]);
        setTransportEntries(p.transports?.length ? p.transports : [{ ...emptyTransport }]);
        setSelectedVisa(p.visa?._id || p.visa || "");
        setRoomTypes(p.roomTypes || roomTypes);
        setNotes(p.notes || "");
        setGroupForm((prev) => ({
          ...prev,
          user: packageGroup.user || prev.user,
          evoucherAccount: packageGroup.evoucherAccount || "",
          sector: packageGroup.sector || "",
          airline: packageGroup.airline || flights[0]?.airline || "",
          groupCategory: packageGroup.groupCategory || "Umrah Groups",
          groupName: packageGroup.groupName || "",
          totalSeats: packageGroup.totalSeats || p.availablePackages || 0,
          days: packageGroup.days || p.packageDuration || 0,
          showSeat: packageGroup.showSeat || false,
          groupType: "Umrah Groups",
          flights,
          passengers: packageGroup.passengers || prev.passengers,
          price: {
            sellingCurrencyB2B: packageGroup.price?.sellingCurrencyB2B || "PKR",
            sellingAdultPriceB2B: packageGroup.price?.sellingAdultPriceB2B || 0,
            sellingChildPriceB2B: packageGroup.price?.sellingChildPriceB2B || 0,
            sellingInfantPriceB2B: packageGroup.price?.sellingInfantPriceB2B || 0,
          },
          contactPersonPhone: packageGroup.contactPersonPhone || "",
          contactPersonEmail: packageGroup.contactPersonEmail || "",
          internalStatus: packageGroup.internalStatus || "Public",
        }));
      }
    } catch { toast.error("Failed to load package"); }
  };

  const updateGroup = (fields: Record<string, unknown>) => {
    setGroupForm((prev) => ({ ...prev, ...fields }));
  };

  const selectAirline = (airlineName: string) => {
    const airline = airlines.find((a) => a.airlineName === airlineName);
    const groupName = airline ? `${airline.airlineName}-${groupForm.sector || "UMRAH"}` : groupForm.groupName;
    setGroupForm((prev) => ({
      ...prev,
      airline: airlineName,
      groupName,
      flights: prev.flights.map((flight) => ({ ...flight, airline: airlineName })),
    }));
    setFlightLogoPreview(airline?.logo || "");
  };

  const updateSector = (sector: string) => {
    const formattedSector = formatSectorInput(sector);
    setGroupForm((prev) => ({
      ...prev,
      sector: formattedSector,
      groupCategory: "Umrah Groups",
      groupType: "Umrah Groups",
      groupName: prev.airline ? `${prev.airline}-${formattedSector || "UMRAH"}` : prev.groupName,
    }));
  };

  const updateFlight = (index: number, fields: Partial<FlightEntry>) => {
    setGroupForm((prev) => {
      const flights = [...prev.flights];
      flights[index] = { ...flights[index], ...fields };
      return { ...prev, flights };
    });
  };

  const addFlight = () => {
    setGroupForm((prev) => ({ ...prev, flights: [...prev.flights, { ...emptyFlight, airline: prev.airline }] }));
  };

  const removeFlight = (index: number) => {
    setGroupForm((prev) => ({ ...prev, flights: prev.flights.filter((_, i) => i !== index) }));
  };

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
      updated[index] = { ...updated[index], hotel: hotelId, hotelName: h?.name || "", city: h?.city || "", distance: h?.distance || 0, rating: h?.rating || 0, mapUrl: h?.mapUrl || "" };
      return updated;
    });
  };

  const addHotelEntry = () => setHotelEntries((prev) => [...prev, { ...emptyHotel }]);
  const removeHotelEntry = (index: number) => setHotelEntries((prev) => prev.filter((_, i) => i !== index));

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoFile(file);
      setLogoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    if (!packageName.trim()) return "Package name is required";
    if (!groupForm.user.trim()) return "Supplier account is required";
    if (!groupForm.sector.trim()) return "Sector is required";
    if (!groupForm.airline) return "Airline is required";
    if (!groupForm.totalSeats) return "Total seats are required";
    const badFlight = groupForm.flights.find((f) => !f.flightNo || !f.depDate || !f.depTime || !f.arrDate || !f.arrTime || !f.sectorFrom || !f.sectorTo);
    if (badFlight) return "Please complete all required flight details";
    return "";
  };

  const buildFormData = () => {
    const fd = new FormData();
    const body = {
      packageName,
      pnr,
      flightLogo: selectedAirline?.logo || flightLogoPreview,
      umrahGroupTicket,
      umrahGroupTicketData: {
        ...(umrahGroupTicket ? { _id: umrahGroupTicket } : {}),
        ...groupForm,
        pnr,
        days: groupForm.days || packageDuration,
      },
      availablePackages,
      packageDuration,
      hotels: hotelEntries,
      transports: transportEntries,
      visa: selectedVisa,
      roomTypes,
      notes,
    };
    fd.append("data", JSON.stringify(body));
    if (logoFile) fd.append("logo", logoFile);
    return fd;
  };

  const handleSave = async (andCopy = false) => {
    const error = validate();
    if (error) return toast.error(error);

    setSubmitting(true);
    try {
      const fd = buildFormData();
      const res = id
        ? await axiosInstance.put(`/umrah-packages/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } })
        : await axiosInstance.post("/umrah-packages", fd, { headers: { "Content-Type": "multipart/form-data" } });

      if (res.data.success) {
        toast.success(id ? "Package updated!" : "Package created!");
        if (andCopy) {
          const txt = buildCopyText(res.data.data);
          await navigator.clipboard.writeText(txt).catch(() => { });
          toast.info("Copied to clipboard");
        }
        navigate("/umrah-packages");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const buildCopyText = (pkg: Record<string, any>) => {
    const rt = pkg.roomTypes || roomTypes;
    return `*${pkg.packageName}*\nDuration: ${pkg.packageDuration} Days\nSharing: ${rt.sharing?.toLocaleString()} | Quint: ${rt.quint?.toLocaleString()} | Quad: ${rt.quad?.toLocaleString()} | Triple: ${rt.triple?.toLocaleString()} | Double: ${rt.double?.toLocaleString()}\n\n${companyContact.name}\nMobile: ${companyContact.mobile}\nEmail: ${companyContact.email}\nAddress: ${companyContact.address}\nWebsite: ${getCurrentWebsite()}`;
  };

  const inputCls = "border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";
  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"; 
  const tableInputCls = "w-full min-w-[110px] border border-gray-300 dark:border-gray-600 rounded px-2 py-2 text-xs bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{id ? "Edit" : "Add"} Umrah Package</h1>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Package Name</label>
          <input value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="Enter package name" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>PNR</label>
          <input value={pnr} onChange={(e) => setPnr(e.target.value.toUpperCase())} placeholder="Enter PNR" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Logo</label>
          <div onClick={() => logoRef.current?.click()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-20 flex items-center justify-center cursor-pointer hover:border-blue-400 transition overflow-hidden">
            {logoPreview ? <img src={logoPreview} alt="logo" className="h-full object-contain" /> : <span className="text-xs text-gray-400">Click to select</span>}
          </div>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold text-gray-800 dark:text-white">Create Umrah Group</h2>
          {flightLogoPreview && <img src={flightLogoPreview} alt="airline logo" className="h-10 max-w-[120px] object-contain" />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Supplier Account</label>
            <input value={groupForm.user} onChange={(e) => updateGroup({ user: e.target.value })} placeholder="Supplier account" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Sector</label>
            <input
              value={groupForm.sector}
              onChange={(e) => updateSector(e.target.value)}
              placeholder="Enter sector"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Airline</label>
            <select value={groupForm.airline} onChange={(e) => selectAirline(e.target.value)} className={inputCls}>
              <option value="">Select airline</option>
              {airlines.map((airline) => <option key={airline._id} value={airline.airlineName}>{airline.airlineName} ({airline.shortCode})</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Group Name</label>
            <input value={groupForm.groupName} onChange={(e) => updateGroup({ groupName: e.target.value })} placeholder="Group name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Total Seats</label>
            <input type="number" min={0} value={groupForm.totalSeats} onChange={(e) => updateGroup({ totalSeats: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Days</label>
            <input type="number" min={0} value={groupForm.days} onChange={(e) => updateGroup({ days: Number(e.target.value) })} className={inputCls} />
          </div>
          <label className="flex items-center gap-2 pt-5 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={groupForm.showSeat} onChange={(e) => updateGroup({ showSeat: e.target.checked })} />
            Show Seat
          </label>
        </div>

        <div className="overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Flight Details</h3>
            <button onClick={addFlight} className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">+ Add More</button>
          </div>
          <table className="w-full text-xs min-w-[1200px]">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                {["Flight#", "Dep Date", "Dep Time", "From", "From Terminal", "To", "To Terminal", "Class", "Arr Date", "Arr Time", "Baggage", "Meal", ""].map((h) => (
                  <th key={h} className="py-2 pr-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupForm.flights.map((flight, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 pr-3"><input value={flight.flightNo} onChange={(e) => updateFlight(i, { flightNo: e.target.value })} className={tableInputCls} /></td>
                  <td className="py-2 pr-3"><input type="date" value={flight.depDate} onChange={(e) => updateFlight(i, { depDate: e.target.value })} className={tableInputCls} /></td>
                  <td className="py-2 pr-3"><input type="time" value={flight.depTime} onChange={(e) => updateFlight(i, { depTime: e.target.value })} className={tableInputCls} /></td>
                  <td className="py-2 pr-3"><input value={flight.sectorFrom} onChange={(e) => updateFlight(i, { sectorFrom: e.target.value.toUpperCase() })} placeholder="LHE" className={tableInputCls} /></td>
                  <td className="py-2 pr-3"><input value={flight.fromTerminal} onChange={(e) => updateFlight(i, { fromTerminal: e.target.value })} className={tableInputCls} /></td>
                  <td className="py-2 pr-3"><input value={flight.sectorTo} onChange={(e) => updateFlight(i, { sectorTo: e.target.value.toUpperCase() })} placeholder="JED" className={tableInputCls} /></td>
                  <td className="py-2 pr-3"><input value={flight.toTerminal} onChange={(e) => updateFlight(i, { toTerminal: e.target.value })} className={tableInputCls} /></td>
                  <td className="py-2 pr-3">
                    <select value={flight.flightClass} onChange={(e) => updateFlight(i, { flightClass: e.target.value })} className={tableInputCls}>
                      <option value="">Select</option>
                      <option value="Economy">Economy</option>
                      <option value="Business">Business</option>
                      <option value="First">First</option>
                    </select>
                  </td>
                  <td className="py-2 pr-3"><input type="date" value={flight.arrDate} onChange={(e) => updateFlight(i, { arrDate: e.target.value })} className={tableInputCls} /></td>
                  <td className="py-2 pr-3"><input type="time" value={flight.arrTime} onChange={(e) => updateFlight(i, { arrTime: e.target.value })} className={tableInputCls} /></td>
                  <td className="py-2 pr-3"><input value={flight.baggage} onChange={(e) => updateFlight(i, { baggage: e.target.value })} placeholder="30kg" className={tableInputCls} /></td>
                  <td className="py-2 pr-3">
                    <select value={flight.meal} onChange={(e) => updateFlight(i, { meal: e.target.value })} className={tableInputCls}>
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td className="py-2">{groupForm.flights.length > 1 && <button onClick={() => removeFlight(i)} className="text-red-500 hover:text-red-700 font-bold text-lg leading-none">x</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Available Packages</label>
          <input type="number" min={0} value={availablePackages} onChange={(e) => setAvailablePackages(Number(e.target.value))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Package Duration (Days)</label>
          <input type="number" min={0} value={packageDuration} onChange={(e) => setPackageDuration(Number(e.target.value))} className={inputCls} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 dark:text-white">Hotels</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                {["Hotel Name", "Supplier", "City", "Distance (m)", "Rating", "Check In", "Check Out", "Nights", "Map URL", ""].map((h) => <th key={h} className="py-2 pr-3 text-left font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {hotelEntries.map((entry, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 pr-3">
                    <select value={entry.hotel} onChange={(e) => selectHotel(i, e.target.value)} className={inputCls}>
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
                  <td className="py-2">{hotelEntries.length > 1 && <button onClick={() => removeHotelEntry(i)} className="text-red-500 hover:text-red-700 font-bold text-lg leading-none">x</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addHotelEntry} className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">+ Add Hotel</button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 dark:text-white">Transport</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                {["Route", "Supplier", "Transport Type", ""].map((h) => <th key={h} className="py-2 pr-3 text-left font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {transportEntries.map((entry, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 pr-3">
                    <select value={entry.transport} onChange={(e) => selectTransport(i, e.target.value)} className={inputCls}>
                      <option value="">Type route...</option>
                      {transports.map((t) => <option key={t._id} value={t._id}>{t.route}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-3"><input value={entry.supplier} onChange={(e) => updateTransportEntry(i, "supplier", e.target.value)} placeholder="Select supplier" className={inputCls} /></td>
                  <td className="py-2 pr-3">
                    <select value={entry.transportType} onChange={(e) => updateTransportEntry(i, "transportType", e.target.value)} className={inputCls}>
                      <option value="">Select type</option>
                      {["Bus", "GMC", "Car", "Van", "Coaster"].map((t) => <option key={t} value={t}>{t}</option>)}
                      {entry.transportType && !["Bus", "GMC", "Car", "Van", "Coaster"].includes(entry.transportType) && <option value={entry.transportType}>{entry.transportType}</option>}
                    </select>
                  </td>
                  <td className="py-2">{transportEntries.length > 1 && <button onClick={() => removeTransportEntry(i)} className="text-red-500 hover:text-red-700 font-bold text-lg leading-none">x</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addTransportEntry} className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">+ Add Transport</button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <label className="block text-sm font-semibold text-gray-800 dark:text-white mb-2">Select Visa *</label>
        <select value={selectedVisa} onChange={(e) => setSelectedVisa(e.target.value)} className={inputCls}>
          <option value="">Select visa...</option>
          {visas.map((v) => <option key={v._id} value={v._id}>{v.visaType} - {v.transport === "with" ? "With" : "Without"} Transport ({v.currency} {v.sellingPrice.toLocaleString()})</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Room Pricing</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(["sharing", "quint", "quad", "triple", "double"] as const).map((type) => (
            <div key={type}>
              <label className={labelCls + " capitalize"}>{type}</label>
              <input type="number" min={0} value={roomTypes[type]} onChange={(e) => setRoomTypes((prev) => ({ ...prev, [type]: Number(e.target.value) }))} className={inputCls} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {(["childWithoutPackage", "infantWithoutPackage"] as const).map((type) => (
            <div key={type}>
              <label className={labelCls}>{type}</label>
              <input type="number" min={0} value={roomTypes[type]} onChange={(e) => setRoomTypes((prev) => ({ ...prev, [type]: Number(e.target.value) }))} className={inputCls} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <label className="block text-sm font-semibold text-gray-800 dark:text-white mb-2">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Add any notes or special instructions..." className={inputCls + " resize-none"} />
      </div>

      <div className="flex justify-end gap-3 pb-8">
        <button onClick={() => handleSave(true)} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-60">Save and Copy</button>
        <button onClick={() => handleSave(false)} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-60">
          {submitting ? "Saving..." : id ? "Update" : "Save"}
        </button>
      </div>
    </div>
  );
}
