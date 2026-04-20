import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import countryCodes from "../../../data/countryCodes.json"; // adjust path
import Select from "react-select";
import Header from "../../../components/Header";
import CommonSections from "../../../components/CommonSections";
import bg from "../../../assets/images/bahrain.webp";

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
        navigate("/");
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
      <Header />
      <div
        className="min-h-screen w-full flex flex-col items-center justify-start bg-no-repeat bg-cover bg-center bg-fixed relative pt-36 md:pt-42 lg:pt-48"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundColor: "#000000",
        }}
      >
        <div className="absolute inset-0 bg-black/55 z-0" />

        <div className="z-10 flex justify-center w-full px-4 md:px-6 mb-20 relative">
          <div className="w-full max-w-2xl rounded-2xl bg-white/95 shadow-2xl p-6 md:p-8 lg:p-10 flex flex-col gap-8 border border-white/70 backdrop-blur-md">
            <div className="flex flex-col gap-1 text-left">
              <h1 className="text-2xl font-semibold text-gray-900">
                Sign in or create an account
              </h1>
              <p className="text-base text-gray-700">
                Already have an account?{" "}
                <Link
                  to="/"
                  className="text-[#2A166D] font-semibold hover:underline"
                >
                  Log in
                </Link>
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              autoComplete="off"
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-4">
                <input
                  autoComplete="organization"
                  type="text"
                  name="companyName"
                  placeholder="Agency Name"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2A166D] focus:border-transparent text-gray-900 placeholder:text-gray-500"
                />

                <input
                  autoComplete="name"
                  type="text"
                  name="name"
                  placeholder="Contact Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2A166D] focus:border-transparent text-gray-900 placeholder:text-gray-500"
                />

                <input
                  autoComplete="email"
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2A166D] focus:border-transparent text-gray-900 placeholder:text-gray-500"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    options={options}
                    value={selectedOption}
                    onChange={(selected) =>
                      handleChange({
                        target: { name: "countryCode", value: selected.value },
                      })
                    }
                    className="w-full"
                    classNamePrefix="country-select"
                    placeholder="Country Code"
                    styles={selectStyles}
                    isSearchable
                  />
                  <input
                    type="text"
                    name="phone"
                    placeholder="Cell"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2A166D] focus:border-transparent text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <input
                  type="text"
                  name="address"
                  placeholder="Address"
                  autoComplete="street-address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2A166D] focus:border-transparent text-gray-900 placeholder:text-gray-500"
                />

                <input
                  type="text"
                  name="city"
                  placeholder="City Name"
                  autoComplete="address-level2"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2A166D] focus:border-transparent text-gray-900 placeholder:text-gray-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3! rounded text-base font-semibold mt-2
                    ${
                      loading
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-[#2A166D] text-white hover:bg-[#3a1c9a] shadow-md"
                    }
                    transition-all duration-200`}
              >
                {loading ? "Creating Account..." : "Sign Up"}
              </button>
            </form>
          </div>
        </div>
      </div>
      <CommonSections />
    </>
  );
};

export default Register;
