import { useEffect, useRef, useState } from "react";
import logo from "../../assets/images/logo.webp"; // Make sure this is your new HD PNG
import { CiMenuFries } from "react-icons/ci";
import { AiOutlineClose } from "react-icons/ai";
import { groupTypes } from "../../data/groupTypes";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import OldHeader from "./OldHeader";

export default function Header({ user, handleLogout }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [hasToken, setHasToken] = useState(() => {
    return !!sessionStorage.getItem("frontend_token");
  });

  useEffect(() => {
    const checkToken = () => {
      const token = sessionStorage.getItem("frontend_token");
      setHasToken(!!token);
    };

    checkToken();

    window.addEventListener("storage", checkToken);

    return () => {
      window.removeEventListener("storage", checkToken);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!profileOpen || !profileRef.current) return;
      if (!profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileOpen]);

  const activeGroupTypes = searchParams
    .getAll("group_type")
    .map((g) => g.toLowerCase().trim());

  if (hasToken) {
    return (
      <>
        <OldHeader user={user} handleLogout={handleLogout} />
      </>
    );
  }

  return (
    // <header className="fixed w-full top-0 left-0 shadow-md z-999">
    //   <div className="relative flex items-center justify-between gap-2 px-3 md:px-6 bg-[#009BB2] py-2 min-h-15 md:min-h-20">
    //     {/* Left Side: Logo + Company Name */}
    //     <div className="flex items-center gap-2 sm:gap-4 flex-1">
    //       {/* <Link to="/" className="w-10 sm:w-12 md:w-16 block shrink-0">
    //         <img
    //           src={logo}
    //           alt="logo"
    //           className="w-full h-auto object-contain"
    //         />
    //       </Link> */}

    //       <div className="flex flex-col">
    //         {/* <h1 className="m-0 font-roboto leading-tight font-bold italic tracking-wider text-[1rem] sm:text-[1.1rem] md:text-[1.25rem] text-white whitespace-nowrap">
    //           Fly Naveed Travel & Tourtravel and tours   )
    //         </h1> */}
    //         {/* Tagline visible only on small/medium screens under the title */}
    //         {/* <p className="m-0 font-roboto leading-tight italic text-white text-[0.65rem] sm:text-[0.75rem] md:hidden">
    //           Excellence in Travel and Recruitment
    //         </p> */}
    //       </div>
    //     </div>

    //     {/* Center/Right: Tagline (Hidden on mobile, visible on MD+) */}
    //     <div className="hidden md:block flex-1 text-center">
    //       <p className="m-0 font-roboto leading-relaxed italic text-white text-sm lg:text-base opacity-90">
    //         Excellence in Travel and Recruitment
    //       </p>
    //     </div>

    //     {/* Right Side: Desktop Nav & User Profile */}
    //     <div className="flex items-center gap-2 sm:gap-4 justify-end">
    //       {user && (
    //         <div className="hidden xl:flex items-center gap-x-4">
    //           {groupTypes.map((group) => {
    //             const isAllGroups = group.path === "all-groups";
    //             const isPathActive = location.pathname === `/${group.path}`;
    //             const isQueryActive = activeGroupTypes.includes(
    //               group.label.toLowerCase(),
    //             );
    //             const isActive =
    //               (isAllGroups &&
    //                 activeGroupTypes.length === 0 &&
    //                 isPathActive) ||
    //               (!isAllGroups && (isPathActive || isQueryActive));

    //             return (
    //               <Link
    //                 key={group.value}
    //                 to={`/${group.path}`}
    //                 className={`text-xs lg:text-sm font-semibold whitespace-nowrap hover:text-yellow-300 transition-colors ${
    //                   isActive ? "text-yellow-300" : "text-white"
    //                 }`}
    //               >
    //                 {group.label}
    //               </Link>
    //             );
    //           })}
    //         </div>
    //       )}

    //       {/* Profile Dropdown / Login Button */}
    //       <div className="flex items-center gap-2">
    //         {!user ? (
    //           <Link
    //             to="/banks"
    //             className="text-white text-xs sm:text-sm font-semibold hover:text-yellow-300"
    //           ></Link>
    //         ) : (
    //           <div ref={profileRef} className="relative hidden md:block">
    //             <button
    //               className="flex items-center gap-2 rounded-full border border-white/30 p-1 pr-3 hover:bg-white/10 transition-colors"
    //               onClick={() => setProfileOpen((p) => !p)}
    //             >
    //               <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#009BB2] font-bold">
    //                 {user.name?.charAt(0).toUpperCase()}
    //               </span>
    //               <span className="text-white text-sm font-semibold hidden lg:inline">
    //                 {user.name}
    //               </span>
    //             </button>

    //             {profileOpen && (
    //               <div className="absolute right-0 top-12 w-48 rounded-lg bg-white shadow-xl py-2 text-sm z-1000 border border-gray-100">
    //                 <div className="px-4 py-2 border-b border-gray-100">
    //                   <p className="text-gray-500 text-xs text-nowrap">
    //                     Signed in as
    //                   </p>
    //                   <p className="font-bold text-[#009BB2] truncate">
    //                     {user.email}
    //                   </p>
    //                 </div>
    //                 {user.role === "Admin" && (
    //                   <button
    //                     onClick={() =>
    //                       (window.location.href = "/admin-portal/")
    //                     }
    //                     className="w-full text-left px-4 py-2 hover:bg-gray-50"
    //                   >
    //                     Admin Portal
    //                   </button>
    //                 )}
    //                 <button
    //                   onClick={() => navigate("/dashboard")}
    //                   className="w-full text-left px-4 py-2 hover:bg-gray-50"
    //                 >
    //                   Dashboard
    //                 </button>
    //                 <button
    //                   onClick={handleLogout}
    //                   className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-50 border-t"
    //                 >
    //                   Logout
    //                 </button>
    //               </div>
    //             )}
    //           </div>
    //         )}

    //         {/* Mobile Menu Toggle */}
    //         {user && (
    //           <button
    //             className="xl:hidden text-white p-1.5"
    //             onClick={() => setOpen(!open)}
    //           >
    //             {open ? (
    //               <AiOutlineClose size={24} />
    //             ) : (
    //               <CiMenuFries size={24} />
    //             )}
    //           </button>
    //         )}
    //       </div>
    //     </div>
    //   </div>

    //   {/* Mobile Sidebar Menu */}
    //   <div
    //     className={`fixed inset-0 top-15 bg-white z-998 transition-transform duration-300 xl:hidden ${
    //       open ? "translate-x-0" : "translate-x-full"
    //     }`}
    //   >
    //     <div className="flex flex-col p-6 gap-4 font-semibold">
    //       {groupTypes.map((group) => (
    //         <Link
    //           key={group.value}
    //           to={group.path}
    //           className="text-lg border-b pb-2 hover:text-[#009BB2]"
    //           onClick={() => setOpen(false)}
    //         >
    //           {group.label}
    //         </Link>
    //       ))}
    //       <button
    //         onClick={() => {
    //           navigate("/dashboard");
    //           setOpen(false);
    //         }}
    //         className="text-left text-lg border-b pb-2"
    //       >
    //         Dashboard
    //       </button>
    //       <button
    //         onClick={() => {
    //           handleLogout();
    //           setOpen(false);
    //         }}
    //         className="text-left text-lg text-red-600"
    //       >
    //         Logout
    //       </button>
    //     </div>
    //   </div>
    // </header>
    <></>
  );
}
