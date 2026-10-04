import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LockKeyhole, Mail, Plane } from "lucide-react";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import logo from "../../../assets/images/logo2.png";
import bg from "../../../assets/images/bgaeroplane.webp";
import "./login.css";

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
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
      const res = await axiosInstance.post("/auth/login", { email: payload.email.trim(), password: payload.password });
      if (res.status === 200 && res.data.success) {
        const { token, user } = res.data;
        sessionStorage.setItem("frontend_token", token);
        sessionStorage.setItem("frontend_user", JSON.stringify(user));
        toast.success("Login successful!");
        if (user.role === "Admin") window.location.href = "/admin-portal/";
        else {
          window.location.href = "/dashboard";
          if (onLogin) onLogin(user);
        }
      }
    } catch (error) {
      if (error.response) toast.error(error.response.data.message || "Login failed");
      else toast.error("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    performLogin(formData);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefills = { email: params.get("email") || "", password: params.get("password") || "" };
    const shouldAuto = (params.get("auto") || params.get("autoLogin")) === "true";
    if (prefills.email || prefills.password) setFormData((prev) => ({ ...prev, ...prefills }));
    if (shouldAuto && prefills.email && prefills.password && !autoLoginTriggered) {
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
      const res = await axiosInstance.post("/auth/forgot-password", { email: forgotEmail.trim() });
      if (res.data?.success) {
        toast.success("Password reset link sent to your email.");
        setShowForgot(false);
      } else toast.error(res.data?.message || "Failed to send reset link");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reset link");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      <main id="login" className="agent-login">
        <section className="agent-login-brand" style={{ backgroundImage: `url(${bg})` }}>
          <div className="agent-login-overlay" />
          <Link to="/" className="agent-login-logo" aria-label="Stack Works Flow home"><img src={logo} alt="Stack Works Flow" /></Link>
          <div className="agent-login-message">
            <span className="agent-login-pill"><Plane size={17} /> Agent portal</span>
            <h1>Welcome back to<br /><strong>Stack Works Flow</strong></h1>
            <p>Manage group bookings, Umrah journeys, payments, and your agency account from one secure workspace.</p>
            <div className="agent-login-stats"><div><strong>10,000+</strong><span>Travellers served</span></div><div><strong>14+</strong><span>Years of service</span></div></div>
          </div>
        </section>

        <section className="agent-login-form-side">
          <div className="agent-login-card">
            <div className="agent-login-kicker"><span /> Sign in</div>
            <h2>Access Your Account</h2>
            <p className="agent-login-subtitle">Enter your credentials to reach your agency control panel.</p>
            <form onSubmit={handleSubmit} autoComplete="off">
              <label htmlFor="login-email">Email address</label>
              <div className="agent-login-input"><Mail size={20} /><input id="login-email" type="email" name="email" placeholder="name@company.com" value={formData.email} onChange={handleChange} required /></div>
              <label htmlFor="login-password">Password</label>
              <div className="agent-login-input"><LockKeyhole size={20} /><input id="login-password" type="password" name="password" placeholder="Enter your password" value={formData.password} onChange={handleChange} required /></div>
              <div className="agent-login-options">
                <label className="agent-login-remember"><input type="checkbox" /> Remember me</label>
                <button type="button" onClick={() => setShowForgot(true)}>Forgot password?</button>
              </div>
              <button type="submit" disabled={loading} className="agent-login-submit">{loading ? <span className="agent-login-spinner" /> : <>Sign in <ArrowRight size={19} /></>}</button>
            </form>
            <div className="agent-login-divider" />
            <p className="agent-login-register">Not registered? <Link to="/auth/register">Apply for an account</Link></p>
            <Link to="/" className="agent-login-home">Return to website</Link>
          </div>
        </section>
      </main>

      {showForgot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForgot(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setShowForgot(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl">×</button>
            <div className="text-center mb-6"><h3 className="text-xl font-bold text-slate-900 mb-2">Reset Password</h3><p className="text-sm text-slate-500">Enter your email and we'll send a reset link.</p></div>
            <form onSubmit={handleForgotPassword}>
              <input type="email" placeholder="Email address" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm mb-4 outline-none focus:border-[#0d91a0]" />
              <button type="submit" disabled={forgotLoading} className="w-full py-3 bg-[#123b73] text-white font-semibold rounded-xl">{forgotLoading ? "Sending..." : "Send Reset Link"}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
