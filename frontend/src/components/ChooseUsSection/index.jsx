import React from "react";
import { BiSolidPlane } from "react-icons/bi";
import { FaGlobe } from "react-icons/fa";
import { GiFalconMoon } from "react-icons/gi";
import { LuHotel } from "react-icons/lu";
import { theme } from "../../theme/theme";

const features = [
  {
    title: "Airline Tickets",
    desc: "Get instant access to worldwide destinations with competitive pricing and 24/7 booking support.",
    icon: <BiSolidPlane className="text-4xl rotate-90" />,
  },
  {
    title: "Visa Services",
    desc: "Simplify your travel with our high-success visa processing and expert documentation handling.",
    icon: <FaGlobe className="text-4xl" />,
  },
  {
    title: "Umrah Packages",
    desc: "All-inclusive, spiritually-focused packages with premium locations and seamless logistics.",
    icon: <GiFalconMoon className="text-4xl" />,
  },
  {
    title: "Hotel Booking",
    desc: "From luxury resorts to budget stays, we offer trusted accommodations at exclusive rates.",
    icon: <LuHotel className="text-4xl" />,
  },
];

export default function ChooseUsSection() {
  return (
    <section
      className="py-20"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.background}, ${theme.colors.backgroundDark})`,
      }}
    >
      <div className="main-container">
        {/* Heading */}
        <div className="text-center max-w-3xl mx-auto">
          <p
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: theme.colors.accent }}
          >
            Why Choose Us
          </p>

          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold mt-3"
            style={{ color: theme.colors.textPrimary }}
          >
            Why Choose World fly travel and tours (Pvt Ltd )
          </h2>

          <div
            className="w-24 h-1 mx-auto mt-4 rounded-full"
            style={{
              background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.accent})`,
            }}
          />

          <p
            className="mt-6 text-base sm:text-lg"
            style={{ color: theme.colors.textSecondary }}
          >
            We provide complete travel solutions including airline tickets,
            visas, Umrah packages, and hotel bookings with unmatched service
            quality.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-14">
          {features.map((item, i) => (
            <div key={i} className="card group">
              {/* Glow Border */}
              <div className="border-glow"></div>

              {/* Blob */}
              <div className="blob"></div>

              {/* Content */}
              <div className="card-inner flex flex-col items-center text-center p-6">
                {/* Icon */}
                <div
                  className="icon-wrapper"
                  style={{
                    background: theme.colors.primary,
                    color: "#fff",
                  }}
                >
                  {item.icon}
                </div>

                <h3
                  className="text-xl font-semibold mt-4 mb-3"
                  style={{ color: theme.colors.primary }}
                >
                  {item.title}
                </h3>

                <p
                  className="text-sm leading-relaxed"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STYLES */}
      <style>{`

      .card {
        position: relative;
        border-radius: 18px;
        overflow: hidden;
        transition: 0.3s;
      }

      .card:hover {
        transform: translateY(-8px) scale(1.03);
      }

      /* Glow border */
      .border-glow {
        position: absolute;
        inset: 0;
        border-radius: 18px;
        padding: 1px;
        background: linear-gradient(135deg, ${theme.colors.primaryLight}, ${theme.colors.accentLight});
        z-index: 1;
      }

      .card-inner {
        position: relative;
        z-index: 2;
        background: rgba(255,255,255,0.9);
        backdrop-filter: blur(14px);
        border-radius: 18px;
        height: 100%;
      }

      /* ICON */
      .icon-wrapper {
        width: 70px;
        height: 70px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: 0.5s;
      }

      .card:hover .icon-wrapper {
        transform: rotate(10deg) scale(1.15);
        background: ${theme.colors.accent};
      }

      /* BLOB */
      .blob {
        position: absolute;
        width: 160px;
        height: 160px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${theme.colors.primaryLight}, ${theme.colors.accentLight});
        filter: blur(40px);
        opacity: 0.3;
        z-index: 0;
        animation: blobMove 7s infinite ease-in-out;
      }

      .card:hover .blob {
        opacity: 0.5;
        animation-duration: 3s;
      }

      @keyframes blobMove {
        0% { top: -40px; left: -40px; }
        25% { top: -40px; left: 70%; }
        50% { top: 60%; left: 70%; }
        75% { top: 60%; left: -40px; }
        100% { top: -40px; left: -40px; }
      }

      `}</style>
    </section>
  );
}
