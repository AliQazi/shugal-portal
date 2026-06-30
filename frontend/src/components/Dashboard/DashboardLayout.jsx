import { useState, useMemo, useEffect, useRef, createContext } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Search,
  LayoutDashboard,
  Users,
  CalendarCheck,
  Building2,
  CreditCard,
  FileText,
  UserCircle,
  Lock,
  LogOut,
  Bell,
  Home,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import logo from "../../assets/images/logo2-.png";
// import axiosInstance from "../../Api/axios";
import axiosInstance from "../../api/axios"

/* ─── Ripple Button Component ─────────────────────────────── */
const RippleButton = ({ children, style, onClick, className, to }) => {
  const [ripples, setRipples] = useState([]);

  const createRipple = (event) => {
    const container = event.currentTarget.getBoundingClientRect();
    const size = Math.max(container.width, container.height);
    const x = event.clientX - container.left - size / 2;
    const y = event.clientY - container.top - size / 2;
    const newRipple = { x, y, size, id: Date.now() };
    setRipples((prev) => [...prev, newRipple]);
    if (onClick) onClick(event);
  };

  const cleanUpRipple = (id) =>
    setRipples((prev) => prev.filter((r) => r.id !== id));

  const rippleEls = ripples.map((r) => (
    <span
      key={r.id}
      onAnimationEnd={() => cleanUpRipple(r.id)}
      style={{
        position: "absolute",
        top: r.y,
        left: r.x,
        width: r.size,
        height: r.size,
        background: "rgba(255,255,255,0.25)",
        borderRadius: "50%",
        pointerEvents: "none",
        transform: "scale(0)",
        animation: "ripple-animation 600ms linear",
      }}
    />
  ));

  const commonProps = {
    className: `ripple-container ${className || ""}`,
    style: {
      ...style,
      position: "relative",
      overflow: "hidden",
      display: "flex",
      width: "100%",
    },
    onClick: createRipple,
  };

  return to ? (
    <Link to={to} {...commonProps}>
      {children}
      {rippleEls}
    </Link>
  ) : (
    <div {...commonProps}>
      {children}
      {rippleEls}
    </div>
  );
};

/* ─── Layout Context ──────────────────────────────────────── */
export const DashboardUIContext = createContext();

const DashboardLayout = ({ user, handleLogout }) => {
  // ── UI States ──
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bookingsExpanded, setBookingsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // ── Special Offers Slider States ──
  const [showOfferPopup, setShowOfferPopup] = useState(false);
  const [allOffers, setAllOffers] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // ── Fetch Special Offers ──
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await axiosInstance.get("/specialOffer/getSpecialOffers");
        if (response.data.success && response.data.data.length > 0) {
          setAllOffers(response.data.data);
          setShowOfferPopup(true);
        }
      } catch (error) {
        console.error("Failed to fetch special offers", error);
      }
    };
    fetchOffers();
  }, []);

  // ── Slider Navigation Logic ──
  const nextSlide = (e) => {
    e?.stopPropagation();
    setCurrentSlide((prev) => (prev === allOffers.length - 1 ? 0 : prev + 1));
  };
  const prevSlide = (e) => {
    e?.stopPropagation();
    setCurrentSlide((prev) => (prev === 0 ? allOffers.length - 1 : prev - 1));
  };

  // ── Layout Effects ──
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 769;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (showOfferPopup) setShowOfferPopup(false);
        else if (sidebarOpen && isMobile) setSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [sidebarOpen, isMobile, showOfferPopup]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const handleMenuClick = () => { if (isMobile) setSidebarOpen(false); };

  // ── Navigation Menu Config ──
  const menuItems = [
    { path: "/", label: "Home", icon: <Home size={18} /> },
    { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} />, exact: true },
    { path: "/dashboard/all-groups", label: "All Groups", icon: <Users size={18} /> },
    {
      label: "My Bookings",
      icon: <CalendarCheck size={18} />,
      hasSubMenu: true,
      menuKey: "bookings",
      subItems: [
        { path: "/dashboard/my-bookings?status=on%20hold", label: "On Hold" },
        { path: "/dashboard/my-bookings?status=confirmed", label: "Confirmed" },
        { path: "/dashboard/my-bookings?status=cancelled", label: "Cancelled" },
        { path: "/dashboard/my-bookings", label: "All Bookings" },
      ],
    },
    { path: "/dashboard/banks", label: "Bank", icon: <Building2 size={18} /> },
    { path: "/dashboard/payment", label: "Payment", icon: <CreditCard size={18} /> },
    { path: "/dashboard/ledger", label: "Ledger", icon: <FileText size={18} /> },
    { path: "/dashboard/profile", label: "My Profile", icon: <UserCircle size={18} /> },
    { path: "/dashboard/team-contacts", label: "Team Contacts", icon: <Users size={18} /> },
    { path: "/dashboard/umrah-package-bookings", label: "Umrah Pkg Bookings", icon: <Package size={18} /> },
    { path: "/dashboard/change-password", label: "Change Password", icon: <Lock size={18} /> },
  ];

  const filteredMenu = useMemo(() => {
    if (!searchQuery.trim()) return menuItems;
    const q = searchQuery.toLowerCase();
    return menuItems.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.subItems?.some(s => s.label.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const isActive = (path) => location.pathname + location.search === path;

  return (
    <DashboardUIContext.Provider value={{ sidebarOpen, setSidebarOpen, bookingsExpanded, setBookingsExpanded, setSearchQuery }}>
      <>
        {/* ── Global Dashboard Styles ── */}
        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes ripple-animation { to { transform: scale(4); opacity: 0; } }
        @keyframes dropdownReveal { from { opacity: 0; transform: translateY(-8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes subMenuSlide { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        
        @keyframes modalShow {
          from { opacity: 0; transform: scale(0.9) translateY(40px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .db-layout * { font-family: 'Plus Jakarta Sans', sans-serif; }
        .sidebar-nav { overflow-y: auto; flex: 1; padding: 8px 12px; }
        .sidebar-nav::-webkit-scrollbar { width: 4px; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 99px; }
        .menu-link:hover { background: #f4f6fb !important; }
        .db-sidebar { transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: fixed !important; top: 0; left: 0; height: 100vh; z-index: 200; }
        
        .db-search:focus { border-color: #21397C !important; box-shadow: 0 0 0 3px rgba(33,57,124,0.1); }
        .dd-item:hover { background: #f4f6fb !important; }
        .dd-item-danger:hover { background: #fff1f2 !important; color: #be123c !important; }

        /* Slider Custom Styles */
        .offers-slider-track {
          display: flex;
          transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
          height: 100%;
          width: 100%;
        }
        .offer-slide {
          min-width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .db-main { margin-left: 0 !important; }
        }
      `}</style>

        <div className="db-layout" style={{ display: "flex", minHeight: "100vh", background: "#f0f2f7" }}>
          {/* Mobile Background Overlay */}
          {sidebarOpen && isMobile && (
            <div onClick={toggleSidebar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 998, backdropFilter: "blur(3px)" }} />
          )}

          {/* ── Sidebar ── */}
          <aside className="db-sidebar" style={{
            width: isMobile ? "280px" : sidebarOpen ? "272px" : "72px",
            background: "#fff",
            borderRight: isMobile ? "none" : "1px solid #e8eaf0",
            display: "flex", flexDirection: "column", flexShrink: 0,
            boxShadow: isMobile ? "8px 0 40px rgba(0, 0, 0, 0.3)" : "4px 0 24px rgba(33,57,124,0.06)",
            zIndex: 999,
            transform: isMobile && !sidebarOpen ? "translateX(-100%)" : "translateX(0)",
            transition: isMobile ? "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)" : "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}>
            {/* Logo Section */}
            <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #f0f2f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div onClick={() => navigate("/")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", justifyContent: "center" }}>
                <img src={user?.logo || logo} alt="Logo" style={{ width: sidebarOpen ? "100px" : "36px", height: "100px", objectFit: "contain", transition: "width 0.3s" }} />
              </div>
            </div>

            {/* Sidebar Search */}
            {sidebarOpen && (
              <div style={{ padding: "14px 16px 8px" }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
                  <input className="db-search" type="text" placeholder="Search menu…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px 8px 32px", border: "1.5px solid #e8eaf0", borderRadius: "8px", fontSize: "13px", background: "#f8f9fc", outline: "none" }} />
                </div>
              </div>
            )}

            {/* Navigation Sidebar List */}
            <nav className="sidebar-nav">
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                {filteredMenu.map((item, index) => (
                  <li key={index}>
                    {item.hasSubMenu ? (
                      <>
                        <RippleButton onClick={() => sidebarOpen && setBookingsExpanded(!bookingsExpanded)} className="menu-link" style={{ alignItems: "center", gap: "12px", padding: sidebarOpen ? "11px 14px" : "11px 0", justifyContent: sidebarOpen ? "flex-start" : "center", borderRadius: "10px", color: "#555", fontWeight: "500", fontSize: "14px", cursor: "pointer" }}>
                          <span style={{ color: "#7a8aaa" }}>{item.icon}</span>
                          {sidebarOpen && <><span style={{ flex: 1 }}>{item.label}</span><ChevronDown size={15} style={{ transform: bookingsExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "0.25s" }} /></>}
                        </RippleButton>
                        <div style={{ maxHeight: sidebarOpen && (bookingsExpanded || (searchQuery.trim() && item.subItems?.some(s => s.label.toLowerCase().includes(searchQuery.toLowerCase())))) ? "300px" : "0px", overflow: "hidden", transition: "max-height 0.3s" }}>
                          <ul style={{ listStyle: "none", padding: "4px 0 4px 12px", margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                            {item.subItems.map((sub, sIdx) => {
                              const active = isActive(sub.path);
                              return (
                                <li key={sIdx}>
                                  <RippleButton to={sub.path} onClick={handleMenuClick} className={active ? "" : "menu-link"} style={{ padding: "9px 14px 9px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: active ? "600" : "400", alignItems: "center", gap: "8px", background: active ? "linear-gradient(90deg,#21397C,#2CA3B4)" : "transparent", color: active ? "#fff" : "#666", textDecoration: "none" }}>
                                    {active && <span className="sub-active-dot" style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />}
                                    {sub.label}
                                  </RippleButton>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </>
                    ) : (
                      (() => {
                        const active = isActive(item.path);
                        return (
                          <RippleButton to={item.path} onClick={handleMenuClick} className={active ? "" : "menu-link"} style={{ alignItems: "center", gap: "12px", padding: sidebarOpen ? "11px 14px" : "11px 0", justifyContent: sidebarOpen ? "flex-start" : "center", borderRadius: "10px", background: active ? "linear-gradient(90deg,#21397C 0%,#2CA3B4 100%)" : "transparent", color: active ? "#fff" : "#555", fontWeight: active ? "600" : "500", fontSize: "14px", textDecoration: "none" }}>
                            <span style={{ color: active ? "#fff" : "#7a8aaa" }}>{item.icon}</span>
                            {sidebarOpen && <span>{item.label}</span>}
                          </RippleButton>
                        );
                      })()
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* ── Main Content Area ── */}
          <div className="db-main" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, marginLeft: isMobile ? 0 : sidebarOpen ? "272px" : "72px", transition: "margin-left 0.3s" }}>
            <header style={{ background: "#fff", padding: isMobile ? "0 12px" : "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e8eaf0", position: "sticky", top: 0, zIndex: 100 }}>
              <button onClick={toggleSidebar} style={{ cursor: "pointer", border: "1.5px solid #e8eaf0", background: "#f8f9fc", borderRadius: "9px", padding: "8px", display: "flex" }}>
                <Menu size={19} color="#444" />
              </button>

              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8f9fc", border: "1.5px solid #e8eaf0", padding: "6px 8px", borderRadius: "10px", cursor: "pointer" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "linear-gradient(135deg,#21397C 0%,#2CA3B4 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700" }}>
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div style={{ textAlign: "left", display: isMobile ? "none" : "block" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#222" }}>{user?.name || "User"}</div>
                    <div style={{ fontSize: "11px", color: "#aaa" }}>{user?.email || ""}</div>
                  </div>
                  <ChevronDown size={15} color="#999" />
                </button>

                {userDropdownOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, background: "#fff", border: "1.5px solid #e8eaf0", borderRadius: "14px", minWidth: "200px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", zIndex: 1000, animation: "dropdownReveal 0.2s ease" }}>
                    <div style={{ padding: "12px", borderBottom: "1px solid #f0f2f7" }}>
                      <div style={{ fontSize: "13px", fontWeight: "700" }}>{user?.name}</div>
                      <div style={{ fontSize: "11px", color: "#999" }}>{user?.email}</div>
                    </div>
                    <div style={{ padding: '6px' }}>
                      <Link to="/dashboard/profile" onClick={() => setUserDropdownOpen(false)} className="dd-item" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", textDecoration: "none", color: "#333", borderRadius: "8px", fontSize: "13px" }}>
                        <UserCircle size={16} /> My Profile
                      </Link>
                      <button onClick={() => { handleLogout(); navigate("/"); }} style={{ width: "100%", padding: "10px 12px", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: "#e11d48", fontSize: "13px", display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </header>

            <main style={{ padding: isMobile ? "12px" : "24px", flex: 1 }}>
              <Outlet />
            </main>
          </div>
        </div>

        {/* ── MASSIVE SPECIAL OFFERS SLIDER POPUP ── */}
        {showOfferPopup && allOffers.length > 0 && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(12px)", padding: "20px"
          }} onClick={() => setShowOfferPopup(false)}>

            <div style={{
              background: "#fff", width: "95%", maxWidth: "1200px", borderRadius: "40px",
              height: "85vh", overflow: "hidden", position: "relative",
              boxShadow: "0 60px 120px -20px rgba(0,0,0,0.6)",
              animation: "modalShow 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            }} onClick={e => e.stopPropagation()}>

              {/* CLOSE BUTTON */}
              <button onClick={() => setShowOfferPopup(false)} style={{
                position: "absolute", top: "30px", right: "30px", zIndex: 110, background: "#fff",
                border: "none", borderRadius: "50%", width: "64px", height: "64px", cursor: "pointer",
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <X size={38} color="#1e293b" strokeWidth={2.5} />
              </button>

              {/* SLIDER NAVIGATION */}
              <button onClick={prevSlide} style={{
                position: "absolute", left: "30px", top: "50%", transform: "translateY(-50%)", zIndex: 100,
                background: "rgba(255,255,255,0.95)", border: "none", borderRadius: "50%", width: "70px", height: "70px",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 15px 35px rgba(0,0,0,0.15)"
              }}>
                <ChevronLeft size={48} color="#21397C" strokeWidth={3} />
              </button>

              <button onClick={nextSlide} style={{
                position: "absolute", right: "30px", top: "50%", transform: "translateY(-50%)", zIndex: 100,
                background: "rgba(255,255,255,0.95)", border: "none", borderRadius: "50%", width: "70px", height: "70px",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 15px 35px rgba(0,0,0,0.15)"
              }}>
                <ChevronRight size={48} color="#21397C" strokeWidth={3} />
              </button>

              {/* SLIDER TRACK */}
              <div className="offers-slider-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                {allOffers.map((offer, idx) => (
                  <div key={idx} className="offer-slide" style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    background: offer.image ? 'transparent' : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                  }}>
                    {/* Image only if exists */}
                    {offer.image && (
                      <img
                        src={offer.image}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}

                    {/* OVERLAY TEXT */}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: offer.image
                        ? "linear-gradient(to top, rgba(15, 23, 42, 0.95) 10%, rgba(15, 23, 42, 0.4) 50%, transparent 100%)"
                        : "linear-gradient(to bottom, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.6))",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: offer.image ? "flex-end" : "flex-start",
                      padding: offer.image ? "80px 100px" : "60px 80px",
                    }}>
                      <div style={{ maxWidth: "800px" }}>
                        <span style={{
                          background: "#2CA3B4", padding: "8px 24px", borderRadius: "99px",
                          fontSize: "14px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1.5px", color: '#fff', ...(offer.image ? {} : { marginLeft: "50px" })
                        }}>
                          Exclusive Deal
                        </span>
                        <h2 style={{
                          fontSize: "36px",
                          fontWeight: "900",
                          color: "#fff", 
                          marginTop: "20px",
                          lineHeight: 1.1,
                          letterSpacing: "-2px",
                          // 👇 Only apply marginLeft when NO image
                          ...(offer.image ? {} : { marginLeft: "50px" })
                        }}>
                          {offer.title}
                        </h2>
                        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "20px", marginTop: "15px", maxWidth: "600px", ...(offer.image ? {} : { marginLeft: "50px" }) }}>
                          Grab this limited time offer now before it's gone!
                        </p>
                        {/* optional button remains commented */}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* PAGINATION DOTS */}
              <div style={{
                position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)",
                display: "flex", gap: "12px", zIndex: 105
              }}>
                {allOffers.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    style={{
                      width: currentSlide === idx ? "45px" : "12px", height: "12px", borderRadius: "10px",
                      background: currentSlide === idx ? "#fff" : "rgba(255,255,255,0.3)",
                      border: 'none', cursor: "pointer", transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    </DashboardUIContext.Provider>
  );
};

export default DashboardLayout;