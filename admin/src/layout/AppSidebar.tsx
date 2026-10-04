import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import logo from "../../../frontend/src/assets/images/logo2.png";

// Assume these icons are imported from an icon library
import {
  BoxIcon,
  ChevronDownIcon,
  GridIcon,
  ListIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
  },
  {
    icon: <UserCircleIcon />,
    name: "Agents",
    path: "/registered-agencies",
  },
  {
    icon: <ListIcon />,
    name: "Add Bank",
    path: "/add-bank",
  },
  {
    icon: <ListIcon />,
    name: "Sector",
    path: "/sector",
  },
  {
    icon: <ListIcon />,
    name: "Airline",
    path: "/airline",
  },
  {
    icon: <TableIcon />,
    name: "Bookings",
    path: "/all-bookings",
  },
  {
    icon: <TableIcon />,
    name: "Special Offers",
    path: "/special-offers",
  },
  {
    icon: <TableIcon />,
    name: "Manage Sectors",
    path: "/manage-sectors",
  },
  {
    icon: <TableIcon />,
    name: "API Groups",
    path: "/api-groups",
  },
  {
    icon: <UserCircleIcon />,
    name: "Team Contacts",
    path: "/team-contacts",
  },
  {
    icon: <TableIcon />,
    name: "Umrah Package",
    subItems: [
      { name: "Hotels", path: "/umrah-hotels", pro: false },
      { name: "Transport", path: "/umrah-transport", pro: false },
      { name: "Visa", path: "/umrah-visa", pro: false },
      { name: "Create Packages", path: "/umrah-packages", pro: false },
      { name: "Manage External Packages", path: "/manage-umrah-packages", pro: false },
      // { name: "Package Bookings", path: "/umrah-package-bookings", pro: false },
    ],
  },
  {
     icon: <BoxIcon />,
     name : "Ummrah Packages Bookings",
     path:"/umrah-package-bookings",
  },
  {
    icon: <TableIcon />,
    name: "Group Ticketing",
    subItems: [
      { name: "View Groups", path: "/group-ticketing", pro: false },
      { name: "Create Group", path: "/group-ticketing/create", pro: false },
    ],
  },
  {
    icon: <TableIcon />,
    name: "Ledger",
    subItems: [
      { name: "View Accounts", path: "/view-accounts", pro: false },
      { name: "View Payment Voucher", path: "/view-payment-voucher", pro: false },
      { name: "Bank Ledger", path: "/bank-ledger", pro: false },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const location = useLocation();
  const isOpen = isExpanded || isMobileOpen;
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

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    navItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu({
              type: "main",
              index,
            });
            submenuMatched = true;
          }
        });
      }
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${openSubmenu?.type === menuType && openSubmenu?.index === index
                ? "menu-item-active"
                : "menu-item-inactive"
                } cursor-pointer`}
            >
              <span
                className={`menu-item-icon-size  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              <span className="menu-item-text">{nav.name}</span>
              <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                    ? "rotate-180 text-brand-500"
                    : ""
                    }`}
              />
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                onClick={closeSidebar}
                className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
              >
                <span
                  className={`menu-item-icon-size ${isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                <span className="menu-item-text">{nav.name}</span>
              </Link>
            )
          )}
          {nav.subItems && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      onClick={closeSidebar}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                        ? "menu-dropdown-item-active"
                        : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`workspace-sidebar fixed top-0 left-0 z-[100000] flex h-dvh w-72.5 max-w-[85vw] flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-transform duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900
        ${isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"}`}
      aria-hidden={!isOpen}
      inert={!isOpen}
    >
      <button type="button" onClick={closeSidebar} aria-label="Close sidebar" className="absolute right-2 top-3 rounded-lg p-2 text-[#bbccdc] hover:bg-[#1c3b55] hover:text-white">
        <span aria-hidden="true" className="text-2xl leading-none">&times;</span>
      </button>
      <div className="flex justify-center py-8">
        <Link to="/" onClick={closeSidebar}>
          <img src={logo} alt="Logo" width={150} height={40} />
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar flex-1">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="mb-4 flex text-xs uppercase leading-5 text-gray-400">Menu</h2>
              {renderMenuItems(navItems, "main")}
            </div>
          </div>
        </nav>
      </div>

      {/* Copyright Footer */}
      <div className="border-t border-gray-200 py-4 text-center dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} <a href="https://shaheenwingstravels.com/" target="_blank" rel="noreferrer">Stack Works Flow</a><br />All rights reserved.
        </p>
      </div>
    </aside>
  );
};

export default AppSidebar;
