import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import countryCodes from "../../../data/countryCodes.json"; // adjust path
import Select from "react-select";
import CommonSections from "../../../components/CommonSections";
import HeroSection from "../../../components/HeroSection";
import bg from "../../../assets/images/uaebg.jpg";
import logo from "../../../assets/images/logo2.png";
import { ArrowRight, Building2, Mail, MapPin, Plane, UserRound } from "lucide-react";
import "./register.css";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    countryCode: "",
    address: "",
    city: "",
    role: "Agency",
    companyName: "",
  });
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Auto-generate a secure password since the form omits password fields
    const generatedPassword = Math.random().toString(36).slice(-10) + "A1!";

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: generatedPassword,
        plainPassword: generatedPassword,
        companyName: formData.companyName.trim(),
        phone: `${formData.countryCode || ""}${formData.phone.trim()}`.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        role: "Agency",
      };

      const res = await axiosInstance.post("/auth/register", payload);

      if (res.status === 201) {
        toast.success("Registration successful! Please login.");
        navigate("/auth/login");
      }
    } catch (error) {
      if (error.response) {
        toast.error(error.response.data.message || "Registration failed");
      } else {
        toast.error("Server error. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const options = countryCodes.map((c) => ({
    value: `+${c.code}`,
    label: `${String.fromCodePoint(
      ...[...c.iso].map((ch) => 127397 + ch.charCodeAt()),
    )} ${c.country} (+${c.code})`,
  }));

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 50,
      height: 50,
      backgroundColor: "#f8f9fb",
      borderColor: state.isFocused ? "#2A166D" : "#d1d5db",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(42, 22, 109, 0.15)" : "none",
      "&:hover": {
        borderColor: state.isFocused ? "#2A166D" : "#cbd5e1",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "0 12px",
    }),
    placeholder: (base) => ({
      ...base,
      color: "#6b7280",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#111827",
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: 48,
    }),
    menu: (base) => ({
      ...base,
      zIndex: 50,
    }),
  };

  // Find selected value
  const selectedOption = options.find(
    (opt) => opt.value === formData.countryCode,
  );

  return (
    <>
      <main className="agency-register">
        <section className="agency-register-visual" style={{ backgroundImage: `url(${bg})` }}>
          <div className="agency-register-overlay" />
          <Link to="/" className="agency-register-logo"><img src={logo} alt="Stack Works Flow" /></Link>
          <div className="agency-register-message">
            <span><Plane size={16} /> Partner network</span>
            <h1>Expand Your Agency<br /><strong>With Stack Works Flow</strong></h1>
            <p>Gain direct access to group inventory, exclusive travel offers, and agency tools built for faster, more confident selling.</p>
          </div>
        </section>

        <section className="agency-register-form-side">
          <div className="agency-register-card">
            <div className="agency-register-kicker"><span /> Register</div>
            <h2>Create Agent Account</h2>
            <p>Already registered? <Link to="/auth/login">Log in to portal</Link></p>

            <form
              onSubmit={handleSubmit}
              autoComplete="off"
              className="agency-register-form"
            >
              <div className="agency-register-full">
                <label>Agency details</label>
                <div className="agency-register-input"><Building2 size={17} />
                <input
                  autoComplete="organization"
                  type="text"
                  name="companyName"
                  placeholder="Agency Name"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className=""
                />
                </div>
              </div>

              <div>
                <label>Contact agent</label>
                <div className="agency-register-input"><UserRound size={17} />
                <input
                  autoComplete="name"
                  type="text"
                  name="name"
                  placeholder="Contact Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className=""
                />
                </div>
              </div>

              <div>
                <label>Email address</label>
                <div className="agency-register-input"><Mail size={17} />
                <input
                  autoComplete="email"
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className=""
                />
                </div>
              </div>

              <div>
                <label>Country code</label>
                  <Select
                    options={options}
                    value={selectedOption}
                    onChange={(selected) =>
                      handleChange({
                        target: { name: "countryCode", value: selected.value },
                      })
                    }
                    className="agency-country-select"
                    classNamePrefix="country-select"
                    placeholder="Country Code"
                    styles={selectStyles}
                    isSearchable
                  />
              </div>
              <div>
                <label>Phone number</label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="Cell"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="agency-register-plain-input"
                  />
              </div>

              <div>
                <label>Office address</label>
                <div className="agency-register-input"><MapPin size={17} />
                <input
                  type="text"
                  name="address"
                  placeholder="Address"
                  autoComplete="street-address"
                  value={formData.address}
                  onChange={handleChange}
                  className=""
                />
                </div>
              </div>

              <div>
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  placeholder="City Name"
                  autoComplete="address-level2"
                  value={formData.city}
                  onChange={handleChange}
                  className="agency-register-plain-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="agency-register-submit agency-register-full"
              >
                {loading ? "Creating Account..." : <>Register Partner Agency <ArrowRight size={17} /></>}
              </button>
            </form>
          </div>
        </section>
      </main>
      <div className="home-page register-home-sections">
        <HeroSection isGuest />
        <CommonSections />
      </div>
    </>
  );
};

export default Register;
