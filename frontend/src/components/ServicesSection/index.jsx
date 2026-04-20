import React from "react";
import { theme } from "../../theme/theme";

import service1 from "../../assets/images/service1.webp";
import service2 from "../../assets/images/service2.webp";
import service3 from "../../assets/images/service3.webp";
import service4 from "../../assets/images/service4.webp";
import service5 from "../../assets/images/service5.webp";
import service6 from "../../assets/images/service6.webp";
import mosque from "../../assets/images/mosque.png";

const services = [
  {
    id: 1,
    title: "Air Tickets",
    description:
      "We arrange safe, comfortable air tickets, activities, and hotels for your stay.",
    image: service1,
  },
  {
    id: 2,
    title: "Umrah Packages",
    description:
      "We offer Umrah travel packages for groups and affordable deals with top service quality.",
    image: service2,
  },
  {
    id: 3,
    title: "Visa Services",
    description:
      "Efficient visa services for seamless international travel with expert guidance.",
    image: service3,
  },
  {
    id: 4,
    title: "Hotel Packages",
    description:
      "Luxurious hotel stays with curated experiences at top destinations worldwide.",
    image: service4,
  },
  {
    id: 5,
    title: "Travel Consultancy",
    description:
      "Expert guidance, personalized bookings, and travel tips for unforgettable adventures.",
    image: service5,
  },
  {
    id: 6,
    title: "Meet & Assist",
    description:
      "Seamless meet and assist services for stress-free airport experiences.",
    image: service6,
  },
];

export default function ServicesSection() {
  return (
    <section
      className="relative py-24 overflow-hidden"
      style={{
        // Grey Background - Different from other sections
        background: `linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)`,
      }}
    >
      {/* Subtle Grid Pattern for Depth */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(100, 116, 139, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100, 116, 139, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="main-container relative z-10 max-w-7xl mx-auto px-6">
        {/* Heading */}
        <div className="text-center mb-20">
          <p
            className="text-sm font-semibold tracking-widest uppercase mb-3"
            style={{ color: theme.colors.accent }}
          >
            OUR EXPERTISE
          </p>
          <h2
            className="text-4xl md:text-5xl font-bold tracking-tight"
            style={{ color: theme.colors.textPrimary }}
          >
            Our Services
          </h2>
          <div
            className="w-24 h-1 mx-auto mt-6 rounded-full"
            style={{
              background: theme.colors.ublGradient,
            }}
          />
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <div
              key={service.id}
              className="group relative rounded-3xl overflow-hidden bg-white shadow-xl hover:shadow-2xl transition-all duration-500"
            >
              {/* Animated Gradient Border */}
              <div
                className="absolute -inset-0.75 rounded-3xl opacity-75 pointer-events-none z-10"
                style={{
                  background: `conic-gradient(
                    from 0deg,
                    transparent 30deg,
                    ${theme.colors.primaryLight} 80deg,
                    ${theme.colors.accentLight} 140deg,
                    ${theme.colors.ublGradientEnd} 220deg,
                    ${theme.colors.primaryLight} 300deg,
                    transparent 330deg
                  )`,
                  backgroundSize: "280% 280%",
                  animation: "borderFlow 12s linear infinite",
                  filter: "blur(5px)",
                }}
              />

              {/* Card Content */}
              <div className="relative z-20 bg-white rounded-3xl overflow-hidden">
                {/* Image Section */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    style={{ height: "100%" }}
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />

                  {/* Image Overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                </div>

                {/* Text Content */}
                <div className="p-8 flex flex-col">
                  <h3
                    className="text-2xl font-semibold mb-3 tracking-tight"
                    style={{ color: theme.colors.textPrimary }}
                  >
                    {service.title}
                  </h3>

                  <p
                    className="text-[15.5px] leading-relaxed flex-1 mb-6"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {service.description}
                  </p>

                  <button
                    className="mt-auto w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md flex items-center justify-center gap-2 group/btn"
                    style={{
                      background: theme.colors.ublGradient,
                      color: "#fff",
                    }}
                  >
                    Learn More
                    <span className="transition-transform duration-300 group-hover/btn:translate-x-1">
                      →
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Background Mosque - Subtle */}
      <img
        src={mosque}
        alt="mosque"
        className="absolute bottom-0 right-0 w-3/4 sm:w-1/2 opacity-6 pointer-events-none"
      />

      {/* Smooth Border Animation */}
      <style jsx>{`
        @keyframes borderFlow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </section>
  );
}
