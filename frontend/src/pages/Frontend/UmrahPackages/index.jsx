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

// Colors updated to match the reference image's pastel borders
const ROOM_STYLES = {
  sharing: { bg: "#e8f4fd", text: "#1565c0", border: "#90caf9" },
  quint: { bg: "#fce4ec", text: "#b0125a", border: "#f48fb1" },
  quad: { bg: "#f3e5f5", text: "#6a1b9a", border: "#ce93d8" },
  triple: { bg: "#e8f5e9", text: "#2e7d32", border: "#a5d6a7" },
  double: { bg: "#fff8e1", text: "#e65100", border: "#ffcc80" },
};

export default function UmrahPackages({ user }) {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ sectors: [], airlines: [], searchKeyword: "", departDate: null });
  const [airlines, setAirlines] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [copiedRow, setCopiedRow] = useState({});

  const primaryColor = theme?.colors?.primary || "#1e3a8a";

  useEffect(() => { fetchPackages(); }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/umrah-packages");
      const fetched = res.data?.data || [];
      const formatted = fetched.map(pkg => ({
        ...pkg,
        id: pkg._id,
        airlineName: pkg.airlineName || pkg.umrahGroupTicket?.flights?.[0]?.airline || "Airline",
        sector: `${pkg.umrahGroupTicket?.flights?.[0]?.sectorFrom || ""}-${pkg.umrahGroupTicket?.flights?.[0]?.sectorTo || ""}`.toUpperCase(),
        flights: pkg.umrahGroupTicket?.flights || pkg.flights || [],
        rooms: pkg.roomTypes || {},
        dept_date: pkg.umrahGroupTicket?.flights?.[0]?.depDate ? new Date(pkg.umrahGroupTicket.flights[0].depDate) : null
      }));
      setAirlines([...new Set(formatted.map(g => g.airlineName))].filter(Boolean).sort());
      setSectors([...new Set(formatted.map(g => g.sector))].filter(Boolean).sort());
      setPackages(formatted);
    } catch (err) { toast.error("Failed to load packages"); }
    finally { setLoading(false); }
  };

  const filteredPackages = packages.filter(pkg => {
    const keyword = filters.searchKeyword.toLowerCase();
    if (filters.airlines.length && !filters.airlines.includes(pkg.airlineName)) return false;
    if (filters.sectors.length && !filters.sectors.includes(pkg.sector)) return false;
    if (keyword && !`${pkg.packageName} ${pkg.airlineName}`.toLowerCase().includes(keyword)) return false;
    if (filters.departDate && pkg.dept_date?.toDateString() !== new Date(filters.departDate).toDateString()) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      <TopBar title="Umrah Packages" icon={<Package className="text-white w-6 h-6" />} />

      <div className="max-w-[1400px] mx-auto p-4">
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
            <aside className="hidden lg:block w-64 shrink-0 bg-white p-6 rounded-xl border border-gray-200 h-fit sticky top-6">
              <h3 className="font-bold text-xs text-gray-400 uppercase mb-4 tracking-widest">Airlines</h3>
              <div className="space-y-2 mb-6">
                {airlines.map(a => (
                  <label key={a} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-blue-600">
                    <input type="checkbox" className="rounded text-blue-600" checked={filters.airlines.includes(a)} onChange={() => setFilters(p => ({ ...p, airlines: p.airlines.includes(a) ? p.airlines.filter(i => i !== a) : [...p.airlines, a] }))} /> {a}
                  </label>
                ))}
              </div>
            </aside>
          )}

          <main className="flex-1 space-y-4">
            {filteredPackages.map((pkg, idx) => {
              const makkah = pkg.hotels?.find(h => /makkah|mecca/i.test(h.city || h.hotelName)) || pkg.hotels?.[0];
              const madinah = pkg.hotels?.find(h => /madin|medina/i.test(h.city || h.hotelName)) || pkg.hotels?.[1];

              return (
                <div key={pkg.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                  
                  {/* HEADER - MATCHING IMAGE GRADIENT */}
                  <header className="px-5 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 bg-gradient-to-r from-[#1e3a8a] via-[#1e3a8a] to-[#2dd4bf] text-white">
                    <div className="flex items-center gap-2 font-bold text-[13px] md:text-sm tracking-wide">
                      {idx + 1} <FaStar className="text-orange-400 text-xs" /> {pkg.packageName.toUpperCase()}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <div className="bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full border border-white/30 text-[10px] font-bold flex items-center gap-1.5 uppercase">
                        📦 {pkg.packageDuration} Days
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full border border-white/30 text-[10px] font-bold flex items-center gap-1.5 uppercase">
                        🌙 {pkg.nightCount || "7+6+7"} Nights
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full border border-white/30 text-[10px] font-bold flex items-center gap-1.5 uppercase">
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
                    <div className="flex flex-col items-center text-center w-[180px] shrink-0">
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
                            <div key={key} style={{ backgroundColor: style.bg, borderColor: style.border }} className="border-2 rounded-lg px-4 py-1.5 min-w-[95px] text-center flex flex-col items-center transition-transform hover:scale-105">
                              <span className="text-[9px] font-black uppercase mb-0.5 tracking-tighter" style={{ color: style.text }}>{key}</span>
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
                    <div className="flex items-center gap-4 w-[280px] shrink-0 justify-end">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-12 mb-2">
                           <img src="https://png.pngtree.com/png-clipart/20220616/original/pngtree-prophet-mohammad-madina-or-madinah-nabawi-mosque-masjid-milad-un-nabi-png-image_8081426.png" className="w-full h-full object-contain" alt="Madinah" />
                        </div>
                        <h4 className="text-[11px] font-black text-gray-800 uppercase leading-tight">{madinah?.hotelName || "Madinah Hotel"}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Madinah</p>
                        <p className="text-[10px] font-bold text-red-500 mt-1">{madinah?.distance || 900} Mtr from Haram</p>
                      </div>

                      <button 
                        onClick={() => navigate("/dashboard/umrah-packages/detail", { state: { group: pkg } })}
                        className="bg-gradient-to-r from-[#1e40af] to-[#0d9488] hover:from-[#1e3a8a] hover:to-[#0f766e] text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-all shadow-md active:scale-95 whitespace-nowrap"
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