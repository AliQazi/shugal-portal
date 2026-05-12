import { useEffect, useRef, useState } from "react";
import logo from "../../assets/images/flynaveed.png";
import { CiMenuFries } from "react-icons/ci";
import { AiOutlineClose } from "react-icons/ai";
import { groupTypes } from "../../data/groupTypes";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { theme } from "../../theme/theme";

export default function OldHeader({ user, handleLogout }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!profileRef.current?.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeGroupTypes = searchParams
    .getAll("group_type")
    .map((g) => g.toLowerCase().trim());

  // Use the exact group_type param value for active detection
  const currentGroupType = searchParams.get("group_type")?.trim() || "";

  return (
    <header className="fixed w-full top-0 left-0 z-999">
      {/* GLASS NAV */}
      <div
        className="backdrop-blur-xl border-b"
        style={{
          background: "rgba(255,255,255,0.9)",
          borderColor: theme.colors.border,
        }}
      >
        <div className="main-container flex items-center justify-between py-3">
          {/* LEFT */}
          <div className="flex items-center gap-4">
            {user && (
              <Link to="/" className="">
                <img
                  style={{ height: "70px" }}
                  src={logo}
                  className="w-full rounded-2xl object-contain"
                />
              </Link>
            )}
            {/* NAV */}
            {user && (
              <div className="hidden xl:flex gap-6">
                {groupTypes.map((group) => {
                  // Active when: same path AND group_type param matches this group's value
                  const isActive =
                    location.pathname === "/all-groups" &&
                    currentGroupType === group.value;

                  return (
                    <Link
                      key={group.value}
                      to={`/${group.path}`}
                      className="relative text-sm font-medium"
                      style={{
                        color: isActive
                          ? theme.colors.primary
                          : theme.colors.textSecondary,
                      }}
                    >
                      {group.label}

                      {isActive && (
                        <span
                          className="absolute left-0 -bottom-1 w-full h-0.5"
                          style={{
                            background: theme.colors.primary,
                          }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3">
            {/* PROFILE */}
            {user && (
              <div ref={profileRef} className="relative hidden md:block">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-2 py-1 rounded-full border"
                  style={{
                    borderColor: theme.colors.border,
                  }}
                >
                  <span
                    className="w-8 h-8 flex items-center justify-center rounded-full font-bold"
                    style={{
                      background: theme.colors.primary,
                      color: "#fff",
                    }}
                  >
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </span>

                  <span
                    className="hidden lg:block text-sm font-medium"
                    style={{ color: theme.colors.textPrimary }}
                  >
                    {user.name || "User"}
                  </span>
                </button>

                {profileOpen && (
                  <div
                    className="absolute right-0 top-12 w-52 rounded-xl shadow-lg py-2"
                    style={{
                      background: "#fff",
                      border: `1px solid ${theme.colors.border}`,
                    }}
                  >
                    <div className="px-4 py-2 text-xs text-gray-500 border-b">
                      {user.email}
                    </div>

                    {user.role === "Admin" && (
                      <button
                        onClick={() =>
                          (window.location.href = "/admin-portal/")
                        }
                        className="w-full text-left px-4 py-2 hover:bg-gray-50"
                      >
                        Admin Portal
                      </button>
                    )}

                    <button
                      onClick={() => navigate("/dashboard")}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50"
                    >
                      Agent Dashboard
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MOBILE ICON */}
            {user && (
              <button onClick={() => setOpen(!open)} className="xl:hidden">
                {open ? <AiOutlineClose /> : <CiMenuFries />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE MENU */}
      <div
        className={`fixed top-0 right-0 h-full w-[80%] max-w-sm bg-white shadow-xl transition-transform duration-300 z-998 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 flex flex-col gap-4">
          {groupTypes.map((group) => (
            <Link
              key={group.value}
              to={`/${group.path}`}
              onClick={() => setOpen(false)}
              className="text-lg border-b pb-2"
              style={{ color: theme.colors.textPrimary }}
            >
              {group.label}
            </Link>
          ))}

          <button
            onClick={() => {
              navigate("/dashboard");
              setOpen(false);
            }}
            className="text-left text-lg"
          >
            Agent Dashboard
          </button>

          <button
            onClick={() => {
              handleLogout();
              setOpen(false);
            }}
            className="text-left text-red-500"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
