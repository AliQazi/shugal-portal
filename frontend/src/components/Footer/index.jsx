import logo from "../../assets/images/logo2.png";
import footerbg from "../../assets/images/footerbg1.jpg";
import { CiLogin } from "react-icons/ci";
import { FaWhatsapp, FaPhoneAlt } from "react-icons/fa";
import { IoMail, IoLocationSharp } from "react-icons/io5";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { theme } from "../../theme/theme";
import footerBg from "../../assets/images/uae.webp";
import { Plane } from "lucide-react";

export default function Footer({ user }) {
  return (
    <>
      {/* TOP CTA */}
      {!user?._id &&
        <div
          className="py-24 px-4" // height barhane ke liye py-24 rakha
          style={{
            background: theme.colors.primary,
          }}
        >
          <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-8">
            {/* Icon & Text Section */}
            <div className="flex flex-col items-center gap-3 text-white">
              {/* Airplane Icon (urta hua feel) */}
              <div className="relative">
                {/* <Plane className="w-20 h-20 text-white opacity-90 -rotate-12" /> */}
                <img
                  src="https://ex-coders.com/html/turmet/assets/img/plane-shape.png"
                  alt=""
                  style={{
                    height: "150px", 
                  }}
                  srcset=""
                />
                {/* Optional: chhota glow ya trail feel ke liye */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-white/20 rounded-full blur-md" />
              </div>

              {/* Mail Icon (optional, agar dono chahte ho toh rakh sakte ho) */}
              {/* <IoMail className="text-6xl opacity-90 -mt-4" /> */}

              <div>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">
                  Your Travel Journey Starts Here
                </h2>
                <p className="text-lg opacity-90 max-w-lg mx-auto">
                  Sign up to get the best travel deals & offers and stay updated
                  with our latest packages.
                </p>
              </div>
            </div>

            {/* Buttons Section */}
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              <Link
                to="/auth/register"
                className="px-8 py-4 rounded-md font-semibold text-lg transition-all hover:bg-opacity-90 shadow-lg"
                style={{
                  background: "#fff",
                  color: theme.colors.primary,
                }}
              >
                Signup Now
              </Link>

              <a
                href="#login"
                className="flex items-center gap-2 px-8 py-4 rounded-md border-2 font-semibold text-lg transition-all hover:bg-white hover:text-[#000] hover:border-white"
                style={{
                  borderColor: "#fff",
                  // color: "#fff",
                }}
              >
                Login <CiLogin className="text-xl" />
              </a>
            </div>
          </div>
        </div>
      }

      {/* MAIN FOOTER */}
      <footer
        className="relative pt-16 text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)), url(${footerbg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="main-container grid grid-cols-1 lg:grid-cols-2 gap-10 pb-12">
          {/* LEFT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Logo */}
            <div>
              <img src={logo} alt="logo" className="w-34 mb-4 p-2 bg-white rounded-2xl" />
              <h2
                className="text-lg font-semibold"
                style={{ color: theme.colors.sidebarTextLight }}
              >
                Shaheen Wings Travels (Pvt Ltd ).
              </h2>
              <p
                className="mt-3 text-sm leading-relaxed"
                style={{ color: theme.colors.sidebarText }}
              >
                We make your travel dreams more beautiful and enjoyable with
                seamless experiences.
              </p>
            </div>

            {/* Links */}
            <div>
              <h3
                className="text-xl mb-5 font-semibold"
                style={{ color: theme.colors.sidebarTextLight }}
              >
                Links
              </h3>

              <div className="flex flex-col gap-3">
                {["Home", "About", "Packages", "Contact"].map((item) => (
                  <button
                    key={item}
                    className="text-left transition-all duration-300 hover:translate-x-1"
                    style={{ color: theme.colors.sidebarText }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Services */}
            <div>
              <h3
                className="text-xl mb-5 font-semibold"
                style={{ color: theme.colors.sidebarTextLight }}
              >
                Services
              </h3>

              <div className="flex flex-col gap-3">
                {["Umrah Groups", "UAE Groups", "KSA Groups"].map((item) => (
                  <button
                    key={item}
                    className="text-left transition-all duration-300 hover:translate-x-1"
                    style={{ color: theme.colors.sidebarText }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3
                className="text-xl mb-5 font-semibold"
                style={{ color: theme.colors.sidebarTextLight }}
              >
                Contact
              </h3>

              <div className="flex flex-col gap-4">
                <a
                  href="https://wa.me/+923145266660"
                  target="_blank"
                  className="flex items-center gap-3 hover:translate-x-1 transition"
                  style={{ color: theme.colors.sidebarText }}
                >
                  <FaWhatsapp className="text-2xl" /> 0309-9802154
                </a>

                <a
                  href="tel:+923145222231"
                  className="flex items-center gap-3 hover:translate-x-1 transition"
                  style={{ color: theme.colors.sidebarText }}
                >
                  <FaPhoneAlt /> 0307-99655120
                </a>

                <a
                  href="tel:0512154600"
                  className="flex items-center gap-3 hover:translate-x-1 transition"
                  style={{ color: theme.colors.sidebarText }}
                >
                  <FaPhoneAlt /> 0304-3121343
                </a>

                <a
                  href="mailto:worldflytravelisb@gmail.com"
                  className="flex items-center gap-3 break-all hover:translate-x-1 transition"
                  style={{ color: theme.colors.sidebarText }}
                >
                  <IoMail /> shaheenwingstravels07@gmail.com
                </a>

                <a
                  href="https://maps.app.goo.gl/FQNy83JNCoqCRcBG6"
                  target="_blank"
                  className="flex items-start gap-3 hover:translate-x-1 transition"
                  style={{ color: theme.colors.sidebarText }}
                >
                  <IoLocationSharp className="mt-1 text-3xl" />
                  MA Plaza Ground Floor Shop # 3, Kahror Pacca
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div
          className="main-container flex flex-col md:flex-row justify-between items-center gap-3 py-6 border-t"
          style={{ borderColor: theme.colors.sidebarBorder }}
        >
          <a
            href="https://worldflytickets.com/"
            style={{ color: theme.colors.sidebarText }}
          >
            &copy; {dayjs().year()} Shaheen Wings Travels (Pvt Ltd ).
          </a>

          <a
            target="_blank"
            href="https://nexagensolution.com/"
            className="text-sm"
            style={{ color: theme.colors.sidebarText }}
          >
            Designed & Developed by Nexagen Solution
          </a>
        </div>
      </footer>
    </>
  );
}
