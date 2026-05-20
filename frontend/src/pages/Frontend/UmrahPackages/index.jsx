import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaRegCopy, FaCheck, FaSearch, FaStar, FaPlaneDeparture, FaPlaneArrival } from "react-icons/fa";
import { Menu, Package, Plane, Moon, Users, Calendar, ClipboardList, ArrowRight } from "lucide-react";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import TopBar from "../../../components/TopBar/TopBar";
import MaskedDatePicker from "../../../components/MaskedDatePicker";
import { theme } from "../../../theme/theme";

const MONTHS_TITLE = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// City to Airport Code Mapping
const CITY_TO_AIRPORT = {
  "FAISALABAD": "LYP",
  "JEDDAH": "JED",
  "MEDINA": "MED",
  "MADINAH": "MED",
  "ISLAMABAD": "ISB",
  "DAMMAM": "DMM",
  "MUSCAT": "MCT",
  "RIYADH": "RUH",
  "LAHORE": "LHE",
  "DUBAI": "DXB",
  "MULTAN": "MUX",
  "PESHAWAR": "PEW",
  "SIALKOT": "SKT",
  "SHARJAH": "SHJ",
  // Already airport codes (3-letter) - keep as is
  "LYP": "LYP",
  "JED": "JED",
  "MED": "MED",
  "ISB": "ISB",
  "DMM": "DMM",
  "MCT": "MCT",
  "RUH": "RUH",
  "LHE": "LHE",
  "DXB": "DXB",
  "MUX": "MUX",
  "PEW": "PEW",
  "SKT": "SKT",
  "SHJ": "SHJ",
};

// Convert sector string to airport codes (e.g., "FAISALABAD-JEDDAH" → "LYP-JED")
const normalizeSector = (sector = "") => {
  const parts = String(sector)
    .split("-")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
  
  return parts
    .map((part) => CITY_TO_AIRPORT[part] || part)
    .join("-");
};

// Normalize airline names to handle variations (e.g., "SAUDI AIRLINE" and "Saudi Airlines" → "SAUDI AIRLINE")
const normalizeAirline = (airline = "") => {
  return String(airline)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/AIRLINES?$/i, "AIRLINE")
    .trim();
};

// Colors updated to match the reference image's pastel borders
const ROOM_STYLES = {
  sharing: { bg: "#e8f4fd", text: "#1565c0", border: "#90caf9", label: "Sharing" },
  quint: { bg: "#fce4ec", text: "#b0125a", border: "#f48fb1", label: "Quint" },
  quad: { bg: "#f3e5f5", text: "#6a1b9a", border: "#ce93d8", label: "Quad" },
  triple: { bg: "#e8f5e9", text: "#2e7d32", border: "#a5d6a7", label: "Triple" },
  double: { bg: "#fff8e1", text: "#e65100", border: "#ffcc80", label: "Double" },
  child_without_bed: { bg: "#fff1f8", text: "#ad1457", border: "#f8bbd0", label: "Child (No Bed)" },
  infant: { bg: "#e0f2fe", text: "#0c4a6e", border: "#bae6fd", label: "Infant" },
};

export default function UmrahPackages({ user }) {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ sectors: [], airlines: [], packageNames: [], searchKeyword: "", departDate: null });
  const [airlines, setAirlines] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [packageNames, setPackageNames] = useState([]);
  const [copiedRow, setCopiedRow] = useState({});

  const primaryColor = theme?.colors?.primary || "#1e3a8a";

  const getPackageStorageKey = (pkg) => {
    const id = pkg?.package_id || pkg?.packageId || pkg?.id || pkg?._id || pkg?.flight?.id || pkg?.flight?.flight_details?.pnr || pkg?.packageName || "package";
    return `umrahPackageDetail_${String(id).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  };

  useEffect(() => { fetchPackages(); }, []);

  const isAbidAirPackage = (pkg) =>
    Boolean(
      pkg?.package_name ||
      pkg?.packageName ||
      pkg?.packageId ||
      pkg?.package_id ||
      pkg?.flight,
    );

  const isAbidAirUmrahPackage = (pkg) => {
    const source = String(pkg?.source || "").toLowerCase();
    const isAbidAirSource = source === "abidairtravel";
    const hasPackageId = Boolean(pkg?.package_id || pkg?.packageId);
    const hasPackageName = Boolean(pkg?.package_name || pkg?.packageName || pkg?.groupName);
    const hasHotels = Boolean(pkg?.hotels || pkg?.hotel);
    const hasRates = Boolean(pkg?.rates || pkg?.rate || pkg?.packageRates || pkg?.package_rates);
    const isFlightPackageType = String(pkg?.flight?.flight_details?.type || "").toUpperCase().trim() === "UMRAH GROUPS";
    const hasPackageStructure = (hasPackageId || hasPackageName || hasHotels) && hasRates;
    return Boolean(isAbidAirSource && (hasPackageStructure || isFlightPackageType));
  };

  const isManualUmrahPackage = (pkg) =>
    Boolean(
      pkg?.packageName &&
      (Array.isArray(pkg?.hotels) && pkg.hotels.length > 0) &&
      pkg?.roomTypes,
    );

  const parsePackageHotels = (pkg) => {
    if (!pkg) return null;

    const normalizeHotelArray = (list) => {
      return list.reduce((acc, hotel) => {
        if (!hotel || !hotel.city) return acc;
        const rawCity = String(hotel.city).trim().toUpperCase();
        let cityKey = rawCity.toLowerCase();
        
        // Normalize MADINAH/MADINA to both use "madinah"
        if (cityKey === "madina") cityKey = "madinah";
        
        if (!cityKey) return acc;
        
        // Only store the first hotel for each city (or update if not already set)
        if (!acc[cityKey]) {
          acc[cityKey] = {
            hotelName: hotel.hotelName || hotel.name || hotel.hotel || "",
            distance: hotel.distance || hotel.distanceFromHaram || hotel.distanceKm || 0,
            rating: hotel.rating || 0,
            supplier: hotel.supplier || "",
            city: hotel.city,
            checkIn: hotel.checkIn || hotel.check_in || "",
            checkOut: hotel.checkOut || hotel.check_out || "",
            nights: hotel.nights || 0,
            mapUrl: hotel.mapUrl || hotel.map_url || "",
          };
        }
        return acc;
      }, {});
    };

    const parseHotelString = (hotelString, cityName) => {
      if (!hotelString) return null;
      
      const str = String(hotelString).trim();
      // Extract distance from format: "Hotel Name (1200-M+Shuttle)"
      const distanceMatch = str.match(/\((\d+)-?[A-Za-z]*\+?[A-Za-z]*\)/);
      const distance = distanceMatch ? parseInt(distanceMatch[1], 10) : 0;
      
      // Extract hotel name by removing the distance part
      const hotelName = str.replace(/\s*\(\d+.*\)/, "").trim();
      
      return {
        hotelName: hotelName || "Hotel",
        distance: distance,
        rating: 0,
        supplier: "",
        city: cityName,
        checkIn: "",
        checkOut: "",
        nights: 0,
        mapUrl: "",
      };
    };

    // Handle string-based hotel format from abidair (e.g., { makkah: "Hotel Name (1200-M+Shuttle)" })
    if (pkg.hotels && typeof pkg.hotels === "object" && !Array.isArray(pkg.hotels)) {
      const result = {};
      Object.entries(pkg.hotels).forEach(([key, value]) => {
        let cityKey = String(key).trim().toLowerCase();
        
        // Normalize city keys
        if (cityKey === "madina") cityKey = "madinah";
        if (cityKey === "makka") cityKey = "makkah";
        
        if (typeof value === "string") {
          // Parse string format hotel data
          result[cityKey] = parseHotelString(value, key);
        } else if (value && typeof value === "object") {
          // Parse structured hotel object
          result[cityKey] = {
            hotelName: value.hotelName || value.name || value.hotel || "Hotel",
            distance: value.distance || value.distanceFromHaram || value.distanceKm || 0,
            rating: value.rating || 0,
            supplier: value.supplier || "",
            city: value.city || key,
            checkIn: value.checkIn || value.check_in || "",
            checkOut: value.checkOut || value.check_out || "",
            nights: value.nights || 0,
            mapUrl: value.mapUrl || value.map_url || "",
          };
        }
      });
      return result;
    }

    // Handle array format
    if (Array.isArray(pkg.hotels)) return normalizeHotelArray(pkg.hotels);
    if (Array.isArray(pkg.hotel)) return normalizeHotelArray(pkg.hotel);
    
    return null;
  };

  const parsePackageRates = (pkg) => {
    const normalizedRates = {
      sharing: 0,
      quint: 0,
      quad: 0,
      triple: 0,
      double: 0,
      child_without_bed: 0,
      infant: 0,
    };

    if (!pkg || typeof pkg !== "object") return normalizedRates;

    const rawRates =
      pkg.rates ||
      pkg.rate ||
      pkg.packageRates ||
      pkg.package_rates ||
      pkg.rooms ||
      pkg.roomTypes ||
      pkg.room_rates ||
      pkg.flight?.rates ||
      pkg.package?.rates ||
      {};

    const normalizeKey = (key) => String(key || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const assign = (key, value) => {
      const amount = Number(value);
      if (!Number.isNaN(amount) && amount > 0) {
        normalizedRates[key] = amount;
      }
    };

    const hydrateFromObject = (obj) => {
      Object.entries(obj).forEach(([rawKey, rawValue]) => {
        const key = normalizeKey(rawKey);
        if (rawValue && typeof rawValue === "object") {
          if ("price" in rawValue || "rate" in rawValue || "amount" in rawValue || "value" in rawValue) {
            assign(key, rawValue.price ?? rawValue.rate ?? rawValue.amount ?? rawValue.value);
          }
          return;
        }

        if (key.includes("sharing") || key.includes("share")) assign("sharing", rawValue);
        else if (key.includes("quint")) assign("quint", rawValue);
        else if (key.includes("quad")) assign("quad", rawValue);
        else if (key.includes("triple") || key.includes("tpl")) assign("triple", rawValue);
        else if (key.includes("double") || key === "dbl") assign("double", rawValue);
        else if (key.includes("child") || key.includes("without_bed")) assign("child_without_bed", rawValue);
        else if (key.includes("infant") || key.includes("baby")) assign("infant", rawValue);
      });
    };

    if (Array.isArray(rawRates)) {
      rawRates.forEach((entry) => {
        if (entry && typeof entry === "object") {
          const key = normalizeKey(entry.type || entry.name || entry.room_type || entry.rate_type || entry.category || "");
          const value = entry.price ?? entry.rate ?? entry.amount ?? entry.value ?? entry.value;
          if (key) {
            hydrateFromObject({ [key]: value });
          }
        }
      });
    } else {
      hydrateFromObject(rawRates);
    }

    const fallback = (key, ...values) => {
      if (normalizedRates[key]) return;
      for (const value of values) {
        if (value === undefined || value === null) continue;
        const amount = Number(value);
        if (!Number.isNaN(amount) && amount > 0) {
          normalizedRates[key] = amount;
          break;
        }
      }
    };

    fallback("sharing", pkg.price, pkg.sharing, pkg.sharing_price, pkg.share);
    fallback("double", pkg.doublePrice, pkg.double_price, pkg.dbl, pkg.double);
    fallback("triple", pkg.triplePrice, pkg.triple_price, pkg.triple, pkg.tpl);
    fallback("quad", pkg.quadPrice, pkg.quad_price, pkg.quad);
    fallback("quint", pkg.quintPrice, pkg.quint_price, pkg.quint);
    fallback("child_without_bed", pkg.childPrice, pkg.child_price, pkg.child, pkg.child_without_bed);
    fallback("infant", pkg.infantPrice, pkg.infant_price, pkg.infant, pkg.baby);

    return normalizedRates;
  };

  const parseFlightDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const computePackageDuration = (pkg) => {
    const dep = pkg.dept_date || pkg.details?.[0]?.dep_date || pkg.details?.[0]?.flight_date || pkg.details?.[0]?.date || null;
    const arv = pkg.arv_date || pkg.details?.[pkg.details.length - 1]?.arv_date || pkg.details?.[pkg.details.length - 1]?.flight_date || pkg.details?.[pkg.details.length - 1]?.date || null;
    const depDate = parseFlightDate(dep);
    const arvDate = parseFlightDate(arv);
    if (depDate && arvDate) {
      const days = Math.round((arvDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 0;
    }
    return 0;
  };

  const buildFlightLegs = (pkg) => {
    const details = Array.isArray(pkg.details) && pkg.details.length > 0 ? pkg.details : null;
    if (details) {
      return details.map((detail) => ({
        flightNo: detail.flight_no || detail.flightNo || detail.flight_number || "",
        airline: pkg.airline?.airline_name || pkg.airline?.short_name || detail.airline || "",
        pnr: pkg.pnr || detail.pnr || "",
        sale_price: Number(pkg.price || pkg.flightPrice || detail.sale_price || 0),
        sectorFrom: detail.origin || detail.from || "",
        sectorTo: detail.destination || detail.to || "",
        depDate: parseFlightDate(detail.dep_date || detail.flight_date || detail.date) || null,
        depTime: detail.dept_time || detail.dep_time || detail.departure_time || "",
        arvDate: parseFlightDate(detail.arv_date || detail.arr_date || detail.arrival_date || null) || null,
        arvTime: detail.arv_time || detail.arr_time || detail.arrival_time || "",
        baggage: detail.baggage || detail.baggage_allowance || pkg.baggage || "",
        meal: detail.meal || detail.meals || pkg.meal || "",
        origin: detail.origin || detail.from || "",
        destination: detail.destination || detail.to || "",
      }));
    }

    const groupTicketFlights = Array.isArray(pkg.umrahGroupTicket?.flights) && pkg.umrahGroupTicket.flights.length > 0
      ? pkg.umrahGroupTicket.flights
      : null;

    if (groupTicketFlights) {
      return groupTicketFlights.map((detail) => ({
        flightNo: detail.flightNo || detail.flight_no || detail.flight_number || "",
        airline: detail.airline || pkg.umrahGroupTicket?.airline || pkg.airline?.airline_name || pkg.airline?.short_name || "",
        pnr: pkg.umrahGroupTicket?.pnr || pkg.pnr || "",
        sale_price: Number(pkg.price || pkg.flightPrice || pkg.umrahGroupTicket?.price?.total || 0),
        sectorFrom: detail.sectorFrom || detail.origin || detail.from || "",
        sectorTo: detail.sectorTo || detail.destination || detail.to || "",
        depDate: parseFlightDate(detail.depDate || detail.dep_date || detail.flight_date || detail.date) || null,
        depTime: detail.depTime || detail.dept_time || detail.dep_time || detail.departure_time || "",
        arvDate: parseFlightDate(detail.arrDate || detail.arv_date || detail.arr_date || detail.arrival_date || null) || null,
        arvTime: detail.arrTime || detail.arv_time || detail.arr_time || detail.arrival_time || "",
        baggage: detail.baggage || detail.baggage_allowance || pkg.baggage || "",
        meal: detail.meal || detail.meals || pkg.meal || "",
        origin: detail.sectorFrom || detail.origin || detail.from || "",
        destination: detail.sectorTo || detail.destination || detail.to || "",
      }));
    }

    const flight = pkg.flight || {};
    const flightDetails = flight.flight_details || {};
    const route = flight.route || {};
    const time = flight.time || {};

    const hasFlightDetails =
      flightDetails.flight_number ||
      route.origin ||
      route.destination ||
      time.departure?.date ||
      time.arrival?.date;

    if (!hasFlightDetails) return [];

    const departureDate = time.departure?.date || null;
    const arrivalDate = time.arrival?.date || null;

    const firstLeg = {
      flightNo: flightDetails.flight_number || "",
      airline: flightDetails.airline || "",
      pnr: flightDetails.pnr || "",
      sale_price: Number(flightDetails.sale_price || 0),
      sectorFrom: route.origin || "",
      sectorTo: route.destination || "",
      depDate: parseFlightDate(departureDate),
      depTime: time.departure?.time || "",
      arvDate: parseFlightDate(arrivalDate),
      arvTime: time.arrival?.time || "",
      baggage: flightDetails.baggage || route.baggage || "",
      meal: flightDetails.meal || "",
      origin: route.origin || "",
      destination: route.destination || "",
    };

    const flights = [firstLeg];

    if (route.is_return || route.return || time.return) {
      flights.push({
        flightNo: route.return?.flight_number || "",
        airline: flightDetails.airline || "",
        pnr: flightDetails.pnr || "",
        sale_price: Number(flightDetails.sale_price || 0),
        sectorFrom: route.return?.departure || route.destination || "",
        sectorTo: route.return?.arrival || route.origin || "",
        depDate: parseFlightDate(time.return?.departure?.date),
        depTime: time.return?.departure?.time || "",
        arvDate: parseFlightDate(time.return?.arrival?.date),
        arvTime: time.return?.arrival?.time || "",
        baggage: route.baggage || flightDetails.baggage || "",
        meal: route.return?.return_meal || flightDetails.meal || "",
        origin: route.return?.departure || route.destination || "",
        destination: route.return?.arrival || route.origin || "",
      });
    }

    return flights;
  };

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const [apiGroups, manualPackages] = await Promise.allSettled([
        axiosInstance.get("/abidair/available-bookings-by-group"),
        axiosInstance.get("/umrah-packages"),
      ]);

      const abidairData =
        apiGroups.status === "fulfilled" ? apiGroups.value.data?.data || [] : [];
        console.log("Fetched API Packages:", abidairData);
      const manualData =
        manualPackages.status === "fulfilled" ? manualPackages.value.data?.data || [] : [];

      const apiPackages = (Array.isArray(abidairData) ? abidairData : []).filter(isAbidAirUmrahPackage);
      const manualPackagesList = (Array.isArray(manualData) ? manualData : []).filter(isManualUmrahPackage);
      const packagesData = [...apiPackages, ...manualPackagesList];

      const uniquePackages = new Map();
      packagesData.forEach((pkg) => {
        const id = String(pkg.package_id || pkg.packageId || pkg.id || pkg._id || pkg.flight?.id || pkg.flight?.flight_details?.pnr || pkg.packageName || Math.random());
        const src = String(pkg.source || pkg.packageSource || (pkg.flight ? "abidairtravel" : "manual")).toLowerCase();
        const key = `${src}-${id}`;
        if (!uniquePackages.has(key)) uniquePackages.set(key, pkg);
      });

      const formatted = Array.from(uniquePackages.values()).map((pkg) => {
        const packageName = pkg.package_name || pkg.packageName || pkg.groupName || pkg.umrahGroupTicket?.groupName || pkg.flight?.type || "Umrah Package";
        const rawAirlineName = pkg.flight?.flight_details?.airline || pkg.umrahGroupTicket?.airline || pkg.airline?.airline_name || pkg.airline?.short_name || "Airline";
        const airlineName = normalizeAirline(rawAirlineName);
        const hotels = parsePackageHotels(pkg);
        const rates = parsePackageRates(pkg);
        const flights = buildFlightLegs(pkg);
        const sector = normalizeSector(
          flights.length > 0
            ? [flights[0]?.sectorFrom, ...flights.map(f => f.sectorTo)].filter(Boolean).join("-")
            : ""
        );
        const duration =  21;
        const hotelNights =
          pkg.nightCount ||
          pkg.hotelNights ||
          (Array.isArray(pkg.hotels)
            ? pkg.hotels.map((h) => h.nights || 0).filter(Boolean).join("+")
            : Object.values(hotels || {}).map((h) => h.nights || 0).filter(Boolean).join("+"));

        return {
          ...pkg,
          hotelNights,
          id: pkg.package_id || pkg.packageId || pkg.id || pkg._id || `${packageName}-${Math.random()}`,
          packageName,
          airlineName,
          sector,
          flights,
          rooms: rates,
          hotels,
          packageDuration: duration,
          availablePackages: pkg.available_no_of_pax || pkg.availablePackages || pkg.availableSeats || 0,
          dept_date: flights[0]?.depDate || null,
        };
      });

      formatted.sort((a, b) => {
        const aTime = a.dept_date?.getTime() ?? 0;
        const bTime = b.dept_date?.getTime() ?? 0;
        return aTime - bTime;
      });

      setAirlines([...new Set(formatted.map((g) => g.airlineName))].filter(Boolean).sort());
      setSectors([...new Set(formatted.map((g) => g.sector))].filter(Boolean).sort());
      setPackageNames([...new Set(formatted.map((g) => g.packageName))].filter(Boolean).sort());
      setPackages(formatted);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const filteredPackages = packages.filter(pkg => {
    const keyword = filters.searchKeyword.toLowerCase();
    if (filters.airlines.length && !filters.airlines.includes(pkg.airlineName)) return false;
    if (filters.sectors.length && !filters.sectors.includes(normalizeSector(pkg.sector))) return false;
    if (filters.packageNames.length && !filters.packageNames.includes(pkg.packageName)) return false;
    if (keyword && !`${pkg.packageName} ${pkg.airlineName}`.toLowerCase().includes(keyword)) return false;
    if (filters.departDate && pkg.dept_date?.toDateString() !== new Date(filters.departDate).toDateString()) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      <TopBar title="Umrah Packages" icon={<Package className="text-white w-6 h-6" />} />

      <div className="max-w-350 mx-auto p-4">
        {/* Toolbar same as before */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <label className="flex items-center cursor-pointer group">
              <input type="checkbox" checked={showAdvancedSearch} onChange={(e) => setShowAdvancedSearch(e.target.checked)} className="sr-only" />
              <div className={`w-11 h-6 rounded-full relative transition-all ${showAdvancedSearch ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${showAdvancedSearch ? 'left-6' : 'left-1'}`} />
              </div>
              <span className="ml-3 text-xs font-black text-gray-500 uppercase tracking-widest">Advanced Filter</span>
            </label>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <MaskedDatePicker value={filters.departDate} onChange={(date) => setFilters(p => ({ ...p, departDate: date }))} placeholderText="Departure Date" />
            <div className="relative">
              <input type="text" placeholder="Search..." className="w-full lg:w-64 pl-4 pr-10 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" onChange={(e) => setFilters(p => ({ ...p, searchKeyword: e.target.value }))} />
              <FaSearch className="absolute right-3 top-3 text-gray-400" size={14} />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {showAdvancedSearch && (
            <aside className="hidden lg:block w-64 shrink-0 bg-white p-6 rounded-xl border border-gray-200 h-fit sticky top-24">
              {/* <div className="mb-6">
                <h3 className="font-bold text-xs text-gray-400 uppercase mb-4 tracking-widest">Package Names</h3>
                <div className="space-y-2">
                  {packageNames.map((name) => (
                    <label key={name} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-blue-600">
                      <input type="checkbox" className="rounded text-blue-600" checked={filters.packageNames.includes(name)} onChange={() => setFilters(p => ({ ...p, packageNames: p.packageNames.includes(name) ? p.packageNames.filter(i => i !== name) : [...p.packageNames, name] }))} /> {name}
                    </label>
                  ))}
                </div>
              </div> */}
              <div className="mb-6">
                <h3 className="font-bold text-xs text-gray-400 uppercase mb-4 tracking-widest">Airlines</h3>
                <div className="space-y-2">
                  {airlines.map(a => (
                    <label key={a} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-blue-600">
                      <input type="checkbox" className="rounded text-blue-600" checked={filters.airlines.includes(a)} onChange={() => setFilters(p => ({ ...p, airlines: p.airlines.includes(a) ? p.airlines.filter(i => i !== a) : [...p.airlines, a] }))} /> {a}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-xs text-gray-400 uppercase mb-4 tracking-widest">Sectors</h3>
                <div className="space-y-2">
                  {sectors.map((sector) => (
                    <label key={sector} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-blue-600">
                      <input type="checkbox" className="rounded text-blue-600" checked={filters.sectors.includes(sector)} onChange={() => setFilters(p => ({ ...p, sectors: p.sectors.includes(sector) ? p.sectors.filter(i => i !== sector) : [...p.sectors, sector] }))} /> {sector}
                    </label>
                  ))}
                </div>
              </div>
            </aside>
          )}

          <main className="flex-1 space-y-4">
            {filteredPackages.map((pkg, idx) => {
              // Access hotels with normalized keys (lowercase)
              const makkah = pkg.hotels?.makkah;
              const madinah = pkg.hotels?.madinah;

              return (
                <div key={pkg.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                  
                  {/* HEADER - MATCHING IMAGE GRADIENT */}
                  <header className="px-5 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 bg-linear-to-r from-[#1e3a8a] via-[#1e3a8a] to-[#2dd4bf] text-white">
                    <div className="flex items-center gap-2 font-bold text-[13px] md:text-sm tracking-wide">
                      {idx + 1} <FaStar className="text-orange-400 text-xs" /> {pkg.packageName.toUpperCase()}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <div className="bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full border border-white/30 text-[14px] font-bold flex items-center gap-1.5 uppercase">
                        📦 {pkg.packageDuration} Days
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full border border-white/30 text-[14px] font-bold flex items-center gap-1.5 uppercase">
                        🌙 {pkg.packageDuration -1 } Nights
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full border border-white/30 text-[13px] font-bold flex items-center gap-1.5 uppercase">
                        👥 Seats: {pkg.availablePackages || 0}
                      </div>
                    </div>
                  </header>

                  {/* FLIGHT STRIP */}
                  {pkg.flights?.length > 0 && (
                    <div className="bg-[#f0f4ff] border-b border-blue-100 px-5 py-2 flex flex-wrap gap-3">
                      {pkg.flights.map((fl, fi) => (
                        <div key={fi} className="flex items-center gap-2 text-[11px] font-bold text-[#1e3a8a] bg-white border border-blue-200 rounded-lg px-3 py-1.5 shadow-sm">
                          <Plane size={12} className="text-blue-500 shrink-0" />
                          <span className="text-blue-700 uppercase tracking-wide">{fl.sectorFrom || "—"}</span>
                          <ArrowRight size={11} className="text-gray-400" />
                          <span className="text-blue-700 uppercase tracking-wide">{fl.sectorTo || "—"}</span>
                          {fl.flightNo && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-black tracking-wide">{fl.flightNo}</span>
                          )}
                          {fl.depDate && (
                            <span className="text-gray-500 font-semibold">
                              {new Date(fl.depDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                            </span>
                          )}
                          {fl.depTime && (
                            <span className="text-gray-400 font-medium">{fl.depTime.slice(0, 5)}</span>
                          )}
                          {fl.airline && (
                            <span className="text-[10px] text-teal-700 font-black uppercase bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">{fl.airline}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* BODY - MATCHING IMAGE LAYOUT */}
                  <div className="p-4 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6 relative">
                    
                    {/* MAKKAH SECTION (Left) */}
                    <div className="flex flex-col items-center text-center w-45 shrink-0">
                      <div className="w-24 h-16 mb-2 overflow-hidden rounded shadow-sm">
                        <img src="https://www.mtctutorials.com/wp-content/uploads/2022/06/Kaaba-High-Quality-PNG-Image-1.png" className="w-full h-full object-contain" alt="Makkah" />
                      </div>
                      <h4 className="text-[11px] font-black text-gray-800 uppercase leading-tight">{makkah?.hotelName || "Makkah Hotel"}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Makkah</p>
                      <p className="text-[10px] font-bold text-red-500 mt-1">{makkah?.distance || 1500} Mtr from Haram</p>
                    </div>

                    {/* CENTER SECTION (Pricing & Notes) */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-5 w-full">
                      
                      {/* Pricing Grid */}
                      <div className="flex flex-wrap justify-center gap-2.5">
                        {Object.entries(ROOM_STYLES).map(([key, style]) => {
                          const price = pkg.rooms[key];
                          if (!price) return null;
                          return (
                            <div key={key} style={{ backgroundColor: style.bg, borderColor: style.border }} className="border-2 rounded-lg px-4 py-1.5 min-w-23.75 text-center flex flex-col items-center transition-transform hover:scale-105">
                              <span className="text-[9px] font-black uppercase mb-0.5 tracking-tighter" style={{ color: style.text }}>{style.label || key}</span>
                              <span className="text-[12px] font-black whitespace-nowrap" style={{ color: style.text }}>RS {Number(price).toLocaleString()}/-</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Note Box */}
                      {pkg.notes && (
                        <div className="w-full max-w-2xl bg-[#fffef0] border border-[#fde68a] rounded-lg px-4 py-2 flex items-center gap-3">
                          <ClipboardList className="text-orange-400 shrink-0" size={16} />
                          <p className="text-[10px] font-bold text-gray-600 leading-normal uppercase">
                            <span className="text-orange-700 mr-1">Note:</span> {pkg.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* MADINAH & BOOKING SECTION (Right) */}
                    <div className="flex items-center gap-4 w-70 shrink-0 justify-end">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-12 mb-2">
                           <img src="https://png.pngtree.com/png-clipart/20220616/original/pngtree-prophet-mohammad-madina-or-madinah-nabawi-mosque-masjid-milad-un-nabi-png-image_8081426.png" className="w-full h-full object-contain" alt="Madinah" />
                        </div>
                        <h4 className="text-[11px] font-black text-gray-800 uppercase leading-tight">{madinah?.hotelName || "Madinah Hotel"}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Madinah</p>
                        <p className="text-[10px] font-bold text-red-500 mt-1">{madinah?.distance || 900} Mtr from Haram</p>
                      </div>

                      <button 
                        onClick={() => {
                          const key = getPackageStorageKey(pkg);
                          try {
                            sessionStorage.setItem(key, JSON.stringify(pkg));
                          } catch (err) {
                            console.warn("Failed to persist package detail state", err);
                          }
                          navigate(`/dashboard/umrah-packages/detail?pkg=${encodeURIComponent(key)}`, { state: { group: pkg } });
                        }}
                        className="bg-linear-to-r from-[#1e40af] to-[#0d9488] hover:from-[#1e3a8a] hover:to-[#0f766e] text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-all shadow-md active:scale-95 whitespace-nowrap"
                      >
                        Book Now
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </main>
        </div>
      </div>
    </div>
  );
}