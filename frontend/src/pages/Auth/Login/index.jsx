import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import logo from "../../../assets/images/logo2.png";
import bg from "../../../assets/images/bgaeroplane.webp";

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [autoLoginTriggered, setAutoLoginTriggered] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const performLogin = async (payload) => {
    setLoading(true);
    try {
      const res = await axiosInstance.post("/auth/login", {
        email: payload.email.trim(),
        password: payload.password,
      });
      if (res.status === 200 && res.data.success) {
        const { token, user } = res.data;
        sessionStorage.setItem("frontend_token", token);
        sessionStorage.setItem("frontend_user", JSON.stringify(user));
        toast.success("Login successful!");
        if (user.role === "Admin") {
          window.location.href = "/admin-portal/";
        } else {
          window.location.href = "/";
          if (onLogin) onLogin(user);
        }
      }
    } catch (error) {
      if (error.response) {
        const msg = error.response.data.message || "Login failed";
        toast.error(msg);
      } else {
        toast.error("Server error. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    performLogin(formData);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefills = {
      email: params.get("email") || "",
      password: params.get("password") || "",
    };
    const shouldAuto =
      (params.get("auto") || params.get("autoLogin")) === "true";
    if (prefills.email || prefills.password) {
      setFormData((prev) => ({ ...prev, ...prefills }));
    }
    if (
      shouldAuto &&
      prefills.email &&
      prefills.password &&
      !autoLoginTriggered
    ) {
      setAutoLoginTriggered(true);
      performLogin(prefills);
    }
  }, [autoLoginTriggered]);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await axiosInstance.post("/auth/forgot-password", {
        email: forgotEmail.trim(),
      });
      if (res.data?.success) {
        toast.success("Password reset link sent to your email.");
        setShowForgot(false);
      } else {
        toast.error(res.data?.message || "Failed to send reset link");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reset link");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      <div
        id="login"
        className="min-h-screen flex items-center justify-center p-4 sm:p-5"
        style={{
          // Main Background with Image and Dark Overlay
          backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.8)), url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="flex flex-col md:flex-row w-full max-w-250 bg-white rounded-2xl shadow-2xl overflow-hidden min-h-140">
          {/* LEFT PANEL - Branded Gradient */}
          <div className="hidden md:flex flex-1 bg-linear-to-br from-[#3c62c9] to-[#2CA3B4] items-center justify-center p-8 lg:p-12 relative overflow-hidden">
            <div className="absolute top-[-50%] right-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_70%)] pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-white/20 via-white/80 to-white/20" />

            <div className="text-center text-white z-10 animate-[fadeInUp_0.6s_ease-out]">
              <div className="w-36 h-36 mx-auto mb-6 rounded-full bg-white flex items-center justify-center p-3">
                <img
                  src={logo}
                  alt="logo"
                  className="w-full h-full object-contain"
                />
              </div>
             <div className="text-center mb-15 mt-10 space-y-4">
          {/* <div className="inline-block px-4 py-1 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-white/70 text-[10px] uppercase tracking-[0.4em] font-bold">
            Established Excellence
          </div> */}
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter uppercase italic">
            Shaheen <span className="text-white">Wings</span>
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-white/50"></div>
            <p className="text-sm text-gray-300 font-medium tracking-widest uppercase">
              Travels
            </p>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-white/50"></div>
          </div>
        </div>
            </div>
          </div>

          {/* RIGHT PANEL - Login Form */}
          <div className="flex-1 p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-center bg-white">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center mb-4 sm:mb-6 mx-auto md:mx-0">
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 fill-[#21397C]"
                viewBox="0 0 24 24"
              >
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 tracking-tight text-center md:text-left">
              Welcome Back
            </h2>
            <p className="text-slate-500 text-sm mb-6 sm:mb-8 text-center md:text-left">
              Please enter your credentials
            </p>

            <form onSubmit={handleSubmit} className="w-full" autoComplete="off">
              <div className="mb-4 sm:mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                      fill="currentColor"
                    />
                  </svg>
                  <input
                    type="email"
                    name="email"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-3 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:border-[#2CA3B4] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="mb-4 sm:mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                      fill="currentColor"
                    />
                  </svg>
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-3 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:border-[#2CA3B4] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-6 sm:mb-7">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-[#21397C] focus:ring-[#21397C]"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-sm font-medium text-[#2CA3B4] hover:text-[#21397C] transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 sm:py-3 bg-linear-to-r from-[#21397C] to-[#2CA3B4] text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all duration-200 disabled:opacity-70 text-sm sm:text-base"
              >
                {loading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                Don't have an account?{" "}
                <Link
                  to="/auth/register"
                  className="font-medium text-[#2CA3B4] hover:text-[#21397C] transition-colors"
                >
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowForgot(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 relative animate-[fadeInUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowForgot(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl"
            >
              ×
            </button>
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Reset Password
              </h3>
              <p className="text-sm text-slate-500">
                Enter your email and we'll send a reset link.
              </p>
            </div>
            <form onSubmit={handleForgotPassword}>
              <input
                type="email"
                placeholder="Email address"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm mb-4 outline-none focus:border-[#2CA3B4]"
              />
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3 bg-linear-to-r from-[#21397C] to-[#2CA3B4] text-white font-semibold rounded-xl"
              >
                {forgotLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default Login;
