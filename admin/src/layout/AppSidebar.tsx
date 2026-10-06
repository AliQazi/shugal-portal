import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import type { IconType } from "react-icons";
import {
  FaBed, FaBuilding, FaBus, FaCog, FaCube, FaFileAlt, FaFileInvoice,
  FaListUl, FaPassport, FaPlane, FaPlusCircle, FaThLarge, FaUniversity,
  FaUser, FaUsers, FaWallet,
} from "react-icons/fa";
import { FiChevronDown, FiChevronRight, FiLogOut, FiX } from "react-icons/fi";
import logo from "../../../frontend/src/assets/images/logo2.png";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";

type NavLink = { name: string; path: string; icon: IconType; matchPaths?: string[] };
type NavGroup = { name: string; icon: IconType; subItems: NavLink[] };
type NavSection = { title: string; items: (NavLink | NavGroup)[] };

const sections: NavSection[] = [
  { title: "Flights", items: [
    { name: "Bookings", path: "/all-bookings", icon: FaPlane, matchPaths: ["/booking-detail"] },
    { name: "Special Offers", path: "/special-offers", icon: FaThLarge },
    { name: "Manage Sectors", path: "/manage-sectors", icon: FaBuilding },
    { name: "Sector", path: "/sector", icon: FaBuilding },
    { name: "Airline", path: "/airline", icon: FaPlane },
    { name: "API Groups", path: "/api-groups", icon: FaCube },
  ] },
  { title: "Agents & Team", items: [
    { name: "Agents", path: "/registered-agencies", icon: FaUsers },
    { name: "Team Contacts", path: "/team-contacts", icon: FaUser },
    { name: "Add Bank", path: "/add-bank", icon: FaUniversity },
  ] },
  { title: "Umrah Packages", items: [{ name: "Umrah Package", icon: FaCube, subItems: [
    { name: "Hotels", path: "/umrah-hotels", icon: FaBed },
    { name: "Transport", path: "/umrah-transport", icon: FaBus },
    { name: "Visa", path: "/umrah-visa", icon: FaPassport },
    { name: "Create Packages", path: "/umrah-packages", icon: FaPlusCircle },
    { name: "Manage External Packages", path: "/manage-umrah-packages", icon: FaCog },
    { name: "Umrah Packages Bookings", path: "/umrah-package-bookings", icon: FaFileAlt },
  ] }] },
  { title: "Group Ticketing", items: [{ name: "Group Ticketing", icon: FaUsers, subItems: [
    { name: "View Groups", path: "/group-ticketing", icon: FaListUl, matchPaths: ["/group-ticketing/edit"] },
    { name: "Create Group", path: "/group-ticketing/create", icon: FaPlusCircle },
  ] }] },
  { title: "Accounting", items: [{ name: "Ledger", icon: FaWallet, subItems: [
    { name: "View Accounts", path: "/view-accounts", icon: FaListUl, matchPaths: ["/ledger"] },
    { name: "View Payment Voucher", path: "/view-payment-voucher", icon: FaFileInvoice },
    { name: "Bank Ledger", path: "/bank-ledger", icon: FaUniversity },
  ] }] },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const isOpen = isExpanded || isMobileOpen;
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});

  const closeSidebar = useCallback(() => {
    if (isMobileOpen) toggleMobileSidebar();
    else if (isExpanded) toggleSidebar();
  }, [isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSidebar();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeSidebar]);

  const isActive = useCallback((item: NavLink) => {
    // The group list must not also be selected on the separate create screen.
    const exactOnly = item.path === "/" || item.path === "/group-ticketing";
    return pathname === item.path || (!exactOnly && pathname.startsWith(`${item.path}/`)) ||
      (item.matchPaths?.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ?? false);
  }, [pathname]);

  useEffect(() => {
    const activeGroup = sections.flatMap((section) => section.items)
      .find((item) => "subItems" in item && item.subItems.some(isActive));
    if (activeGroup) {
      setClosedGroups((previous) => previous[activeGroup.name]
        ? { ...previous, [activeGroup.name]: false } : previous);
    }
  }, [isActive]);

  const renderLink = (item: NavLink, nested = false) => {
    const Icon = item.icon;
    const active = isActive(item);
    return (
      <Link to={item.path} onClick={closeSidebar}
        className={`admin-sidebar-link${item.path === "/" ? " admin-sidebar-dashboard" : ""}${nested ? " admin-sidebar-link--nested" : ""}${active ? " is-active" : ""}`}
        aria-current={active ? "page" : undefined}>
        <Icon className="admin-sidebar-icon" aria-hidden="true" />
        <span className="admin-sidebar-label">{item.name}</span>
        <FiChevronRight className="admin-sidebar-chevron" aria-hidden="true" />
      </Link>
    );
  };

  return (
    <aside className={`workspace-sidebar admin-sidebar${isOpen ? " is-open" : ""}`}
      aria-label="Admin sidebar" aria-hidden={!isOpen} inert={!isOpen}>
      <div className="admin-sidebar-brand">
        <Link to="/" onClick={closeSidebar} className="admin-sidebar-logo" aria-label="Stack Works Flow dashboard">
          <img src={logo} alt="Stack Works Flow" />
        </Link>
        <button type="button" onClick={closeSidebar} aria-label="Close sidebar" className="admin-sidebar-close">
          <FiX aria-hidden="true" />
        </button>
      </div>

      <div className="admin-sidebar-scroll">
        <nav aria-label="Admin navigation">
          {renderLink({ name: "Dashboard", path: "/", icon: FaThLarge })}
          {sections.map((section, sectionIndex) => (
            <section className="admin-sidebar-section" key={section.title} aria-labelledby={`admin-nav-heading-${sectionIndex}`}>
              <h2 id={`admin-nav-heading-${sectionIndex}`} className="admin-sidebar-heading">{section.title}</h2>
              <ul className="admin-sidebar-list">
                {section.items.map((item) => {
                  if (!("subItems" in item)) return <li key={item.name}>{renderLink(item)}</li>;
                  const Icon = item.icon;
                  const expanded = !closedGroups[item.name];
                  const active = item.subItems.some(isActive);
                  const submenuId = `admin-nav-submenu-${sectionIndex}`;
                  return (
                    <li key={item.name} className={`admin-sidebar-group${expanded ? " is-expanded" : ""}${active ? " has-active-link" : ""}`}>
                      <button type="button" className="admin-sidebar-link admin-sidebar-group-toggle"
                        aria-expanded={expanded} aria-controls={submenuId}
                        onClick={() => setClosedGroups((previous) => ({ ...previous, [item.name]: expanded }))}>
                        <Icon className="admin-sidebar-icon" aria-hidden="true" />
                        <span className="admin-sidebar-label">{item.name}</span>
                        <FiChevronDown className="admin-sidebar-chevron" aria-hidden="true" />
                      </button>
                      <ul id={submenuId} className="admin-sidebar-submenu" hidden={!expanded}>
                        {item.subItems.map((subItem) => <li key={subItem.path}>{renderLink(subItem, true)}</li>)}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
      </div>

      <div className="admin-sidebar-account">
        <span className="admin-sidebar-avatar"><FaUser aria-hidden="true" /></span>
        <div className="admin-sidebar-account-details">
          <p title={user?.companyName || user?.name}>{user?.companyName || user?.name || "Stack Works Flow"}</p>
          <span className="admin-sidebar-account-role">{user?.role || "Admin"}<span className="admin-sidebar-status" aria-label="Signed in" /></span>
        </div>
        <button type="button" onClick={logout} aria-label="Sign out" title="Sign out" className="admin-sidebar-logout">
          <FiLogOut aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
