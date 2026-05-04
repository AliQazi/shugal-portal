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
} from "lucide-react";
import logo from "../../assets/images/logo2-.png";

/* ─── Ripple ─────────────────────────────────────────────── */
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

/* ─── Layout ─────────────────────────────────────────────── */
export const DashboardUIContext = createContext();

const DashboardLayout = ({ user, handleLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bookingsExpanded, setBookingsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 769; // 768px se thoda upar
      setIsMobile(mobile);

      if (mobile) {
        setSidebarOpen(false); // mobile pe hamesha closed start
      } else {
        setSidebarOpen(true); // desktop pe by default open
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close sidebar on Escape key (mobile)
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && sidebarOpen && isMobile) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [sidebarOpen, isMobile]);

  // Clear search when mobile sidebar closes
  useEffect(() => {
    if (isMobile && !sidebarOpen) {
      setSearchQuery("");
    }
  }, [sidebarOpen, isMobile]);

  // Close dropdown on outside click
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

  const handleMenuClick = () => {
    if (isMobile) setSidebarOpen(false);
  };

  const menuItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      exact: true,
    },
    {
      path: "/dashboard/all-groups",
      label: "All Groups",
      icon: <Users size={18} />,
    },
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
    {
      path: "/dashboard/payment",
      label: "Payment",
      icon: <CreditCard size={18} />,
    },
    {
      path: "/dashboard/ledger",
      label: "Ledger",
      icon: <FileText size={18} />,
    },
    {
      path: "/dashboard/profile",
      label: "My Profile",
      icon: <UserCircle size={18} />,
    },
    {
      path: "/dashboard/team-contacts",
      label: "Team Contacts",
      icon: <Users size={18} />,
    },
    {
      path: "/dashboard/change-password",
      label: "Change Password",
      icon: <Lock size={18} />,
    },
  ];

  const filteredMenu = useMemo(() => {
    if (!searchQuery.trim()) return menuItems;
    const q = searchQuery.toLowerCase();
    return menuItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.subItems?.some((s) => s.label.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const isActive = (path) => location.pathname + location.search === path;

  return (
    <DashboardUIContext.Provider value={{ sidebarOpen, setSidebarOpen, bookingsExpanded, setBookingsExpanded, setSearchQuery }}>
      <>
        {/* ── Keyframes injected once ── */}
        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; }

        @keyframes ripple-animation {
          to { transform: scale(4); opacity: 0; }
        }

        @keyframes dropdownReveal {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)  scale(1);    }
        }

        @keyframes subMenuSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .db-layout * { font-family: 'Plus Jakarta Sans', sans-serif; }

        /* Sidebar nav scroll */
        .sidebar-nav { overflow-y: auto; flex: 1; padding: 8px 12px; }
        .sidebar-nav::-webkit-scrollbar { width: 4px; }
        .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 99px; }

        /* Hover on plain links */
        .menu-link:hover { background: #f4f6fb !important; }

        /* Search focus ring */
        .db-search:focus { border-color: #21397C !important; box-shadow: 0 0 0 3px rgba(33,57,124,0.1); }

        /* Dropdown items */
        .dd-item { transition: background 0.15s ease, color 0.15s ease; }
        .dd-item:hover { background: #f4f6fb !important; }
        .dd-item-danger:hover { background: #fff1f2 !important; color: #be123c !important; }

        /* Sidebar transition */
        .db-sidebar {
          transition: width 0.3s cubic-bezier(0.4,0,0.2,1);
          will-change: width;
          position: fixed !important;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 200;
        }

        /* Active sub-item dot */
        .sub-active-dot {
          width: 6px; height: 6px;
          background: #fff; border-radius: 50%;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .db-main   { margin-left: 0 !important; }
          .sidebar-close-btn { display: flex !important; }
        }
      `}</style>

        <div
          className="db-layout"
          style={{ display: "flex", minHeight: "100vh", background: "#f0f2f7" }}
        >
          {/* Mobile overlay */}
          {sidebarOpen && isMobile && (
            <div
              onClick={toggleSidebar}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 998, // ← Sidebar se neeche
                backdropFilter: "blur(3px)",
                touchAction: "none", // mobile touch ke liye better
              }}
            />
          )}

          {/* ── Sidebar ── */}
          <aside
            className="db-sidebar"
            style={{
              width: isMobile ? "280px" : sidebarOpen ? "272px" : "72px",
              background: "#fff",
              borderRight: isMobile ? "none" : "1px solid #e8eaf0",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              boxShadow: isMobile
                ? "8px 0 40px rgba(0, 0, 0, 0.3)"
                : "4px 0 24px rgba(33,57,124,0.06)",

              overflow: "hidden",

              // ← Yeh important changes
              position: "fixed",
              top: 0,
              left: 0,
              height: "100vh",
              zIndex: 999, // ← Overlay se upar

              transform:
                isMobile && !sidebarOpen ? "translateX(-100%)" : "translateX(0)",

              transition: isMobile
                ? "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)"
                : "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {/* Logo */}
            <div
              style={{
                padding: "20px 16px 16px",
                borderBottom: "1px solid #f0f2f7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                onClick={() => navigate("/dashboard")}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <img
                  src={user?.logo || logo}
                  alt="Logo"
                  style={{
                    width: sidebarOpen ? "100px" : "36px",
                    height: "100px",
                    objectFit: "contain",
                    transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
                    flexShrink: 0,
                  }}
                />
              </div>
              {sidebarOpen && isMobile && (
                <button
                  className="sidebar-close-btn"
                  onClick={toggleSidebar}
                  style={{
                    background: "#f4f6fb",
                    border: "1px solid #e8eaf0",
                    borderRadius: "8px",
                    padding: "6px",
                    cursor: "pointer",
                    display: "flex",
                  }}
                >
                  <X size={16} color="#555" />
                </button>
              )}
            </div>

            {/* Search */}
            {sidebarOpen && (
              <div style={{ padding: "14px 16px 8px" }}>
                <div style={{ position: "relative" }}>
                  <Search
                    size={14}
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#aaa",
                    }}
                  />
                  <input
                    className="db-search"
                    type="text"
                    placeholder="Search menu…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px 8px 32px",
                      border: "1.5px solid #e8eaf0",
                      borderRadius: "8px",
                      fontSize: "13px",
                      color: "#444",
                      background: "#f8f9fc",
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Nav */}
            <nav className="sidebar-nav">
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                {filteredMenu.map((item, index) => (
                  <li key={index}>
                    {item.hasSubMenu ? (
                      <>
                        <RippleButton
                          onClick={() =>
                            sidebarOpen && setBookingsExpanded(!bookingsExpanded)
                          }
                          className="menu-link"
                          style={{
                            alignItems: "center",
                            gap: "12px",
                            padding: sidebarOpen ? "11px 14px" : "11px 0",
                            justifyContent: sidebarOpen ? "flex-start" : "center",
                            borderRadius: "10px",
                            color: "#555",
                            fontWeight: "500",
                            fontSize: "14px",
                            cursor: "pointer",
                            textDecoration: "none",
                            transition: "background 0.15s",
                          }}
                        >
                          <span style={{ flexShrink: 0, color: "#7a8aaa" }}>
                            {item.icon}
                          </span>
                          {sidebarOpen && (
                            <>
                              <span style={{ flex: 1 }}>{item.label}</span>
                              <span
                                style={{
                                  transform: bookingsExpanded
                                    ? "rotate(180deg)"
                                    : "rotate(0deg)",
                                  transition:
                                    "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
                                  color: "#aaa",
                                }}
                              >
                                <ChevronDown size={15} />
                              </span>
                            </>
                          )}
                        </RippleButton>

                        {/* Submenu with smooth animation */}
                        <div
                          style={{
                            maxHeight:
                              sidebarOpen && (bookingsExpanded || (searchQuery.trim() && item.subItems?.some(s => s.label.toLowerCase().includes(searchQuery.toLowerCase()))))
                                ? "300px"
                                : "0px",
                            overflow: "hidden",
                            transition:
                              "max-height 0.3s cubic-bezier(0.4,0,0.2,1)",
                          }}
                        >
                          <ul
                            style={{
                              listStyle: "none",
                              padding: "4px 0 4px 12px",
                              margin: 0,
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                            }}
                          >
                            {item.subItems.map((sub, sIdx) => {
                              const active = isActive(sub.path);
                              return (
                                <li key={sIdx}>
                                  <RippleButton
                                    to={sub.path}
                                    onClick={handleMenuClick}
                                    className={active ? "" : "menu-link"}
                                    style={{
                                      padding: "9px 14px 9px 16px",
                                      borderRadius: "8px",
                                      fontSize: "13px",
                                      fontWeight: active ? "600" : "400",
                                      alignItems: "center",
                                      gap: "8px",
                                      background: active
                                        ? "linear-gradient(90deg,#21397C,#2CA3B4)"
                                        : "transparent",
                                      color: active ? "#fff" : "#666",
                                      textDecoration: "none",
                                      animation: bookingsExpanded
                                        ? `subMenuSlide 0.2s ease ${sIdx * 40}ms both`
                                        : "none",
                                    }}
                                  >
                                    {active && (
                                      <span className="sub-active-dot" />
                                    )}
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
                          <RippleButton
                            to={item.path}
                            onClick={handleMenuClick}
                            className={active ? "" : "menu-link"}
                            style={{
                              alignItems: "center",
                              gap: "12px",
                              padding: sidebarOpen ? "11px 14px" : "11px 0",
                              justifyContent: sidebarOpen
                                ? "flex-start"
                                : "center",
                              borderRadius: "10px",
                              background: active
                                ? "linear-gradient(90deg,#21397C 0%,#2CA3B4 100%)"
                                : "transparent",
                              color: active ? "#fff" : "#555",
                              fontWeight: active ? "600" : "500",
                              fontSize: "14px",
                              textDecoration: "none",
                              transition: "background 0.15s",
                            }}
                          >
                            <span
                              style={{
                                flexShrink: 0,
                                color: active ? "#fff" : "#7a8aaa",
                              }}
                            >
                              {item.icon}
                            </span>
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

          {/* ── Main ── */}
          <div
            className="db-main"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              // Mobile pe kabhi margin mat do jab sidebar closed ho
              marginLeft: isMobile ? 0 : sidebarOpen ? "272px" : "72px",
              transition: "margin-left 0.3s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            {/* Header */}
            <header
              style={{
                background: "#fff",
                padding: isMobile ? "0 12px" : "0 24px",
                height: "64px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #e8eaf0",
                boxShadow: "0 2px 12px rgba(33,57,124,0.05)",
                position: "sticky",
                top: 0,
                zIndex: 100,
                gap: "8px",
              }}
            >
              {/* Hamburger */}
              <button
                onClick={toggleSidebar}
                style={{
                  cursor: "pointer",
                  border: "1.5px solid #e8eaf0",
                  background: "#f8f9fc",
                  borderRadius: "9px",
                  padding: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#eef0f8";
                  e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(33,57,124,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f8f9fc";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <Menu size={19} color="#444" />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "12px" }}>
                {/* Bell */}
                <button
                  style={{
                    background: "#f8f9fc",
                    border: "1.5px solid #e8eaf0",
                    borderRadius: "9px",
                    padding: "8px",
                    display: "flex",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <Bell size={18} color="#7a8aaa" />
                  <span
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "6px",
                      width: "8px",
                      height: "8px",
                      background: "#ef4444",
                      borderRadius: "50%",
                      border: "2px solid #fff",
                    }}
                  />
                </button>

                {/* User Dropdown */}
                <div ref={dropdownRef} style={{ position: "relative" }}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: userDropdownOpen ? "#f0f2f7" : "#f8f9fc",
                      border: "1.5px solid #e8eaf0",
                      padding: "6px 8px 6px 6px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "background 0.2s, box-shadow 0.2s",
                      boxShadow: userDropdownOpen
                        ? "0 2px 12px rgba(33,57,124,0.12)"
                        : "none",
                      maxWidth: isMobile ? "160px" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!userDropdownOpen)
                        e.currentTarget.style.background = "#eef0f8";
                    }}
                    onMouseLeave={(e) => {
                      if (!userDropdownOpen)
                        e.currentTarget.style.background = "#f8f9fc";
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "8px",
                        background: user?.logo
                          ? `url(${user.logo}) center/cover`
                          : "linear-gradient(135deg,#21397C 0%,#2CA3B4 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "14px",
                        flexShrink: 0,
                      }}
                    >
                      {!user?.logo && (user?.name?.[0]?.toUpperCase() || "U")}
                    </div>

                    <div style={{ textAlign: "left", lineHeight: 1.3, overflow: "hidden", display: isMobile ? "none" : "block", minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#222",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "120px",
                        }}
                      >
                        {user?.name || "User"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#aaa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}>
                        {user?.email || ""}
                      </div>
                    </div>

                    <ChevronDown
                      size={15}
                      style={{
                        color: "#999",
                        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
                        transform: userDropdownOpen
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        flexShrink: 0,
                        display: isMobile ? "none" : "block",
                      }}
                    />
                  </button>

                  {/* ── Dropdown Panel ── */}
                  {userDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 10px)",
                        right: 0,
                        background: "#fff",
                        border: "1.5px solid #e8eaf0",
                        borderRadius: "14px",
                        minWidth: "200px",
                        maxWidth: "calc(100vw - 24px)",
                        boxShadow:
                          "0 16px 48px rgba(33,57,124,0.15), 0 4px 16px rgba(0,0,0,0.06)",
                        zIndex: 1000,
                        overflow: "hidden",
                        animation:
                          "dropdownReveal 0.2s cubic-bezier(0.34,1.56,0.64,1) both",
                        transformOrigin: "top right",
                      }}
                    >
                      {/* User info header */}
                      <div
                        style={{
                          padding: "14px 16px",
                          borderBottom: "1px solid #f0f2f7",
                          background:
                            "linear-gradient(135deg, #f8f9fc 0%, #eef0f8 100%)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: "700",
                            color: "#222",
                          }}
                        >
                          {user?.name || "User"}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#999",
                            marginTop: "2px",
                          }}
                        >
                          {user?.email || ""}
                        </div>
                      </div>

                      <div style={{ padding: "6px" }}>
                        <Link
                          to="/dashboard/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="dd-item"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px 12px",
                            textDecoration: "none",
                            color: "#333",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: "500",
                          }}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              background: "#f0f2f7",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <UserCircle size={16} color="#21397C" />
                          </div>
                          My Profile
                        </Link>

                        <div
                          style={{
                            height: "1px",
                            background: "#f0f2f7",
                            margin: "4px 0",
                          }}
                        />

                        <button
                          className="dd-item dd-item-danger"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            handleLogout();
                            navigate("/");
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px 12px",
                            background: "transparent",
                            border: "none",
                            textAlign: "left",
                            cursor: "pointer",
                            color: "#e11d48",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: "500",
                          }}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              background: "#fff1f2",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <LogOut size={16} color="#e11d48" />
                          </div>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <main style={{ padding: isMobile ? "12px" : "24px", flex: 1, minWidth: 0 }}>
              <Outlet />
            </main>
          </div>
        </div>
      </>
    </DashboardUIContext.Provider>
  );
};

export default DashboardLayout;
