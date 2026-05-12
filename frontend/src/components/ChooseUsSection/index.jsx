import React from "react";
import { BiSolidPlane } from "react-icons/bi";
import { GiFalconMoon } from "react-icons/gi";
import { LuHotel } from "react-icons/lu";
import { theme } from "../../theme/theme";
import { FaShieldAlt, FaHeadset, FaPlane , FaGlobe } from "react-icons/fa";

const features = [
  {
    title: "Global Connectivity",
    desc: "Instant access to 500+ airlines worldwide with competitive pricing and 24/7 dedicated booking support.",
    icon: <BiSolidPlane className="text-3xl rotate-45" />,
    color: "#3b82f6"
  },
  {
    title: "High-Success Visas",
    desc: "Our expert documentation handling ensures a seamless approval process for even the most complex destinations.",
    icon: <FaGlobe className="text-3xl" />,
    color: "#10b981"
  },
  {
    title: "Sacred Journeys",
    desc: "Umrah packages designed with spirituality in mind, featuring premium hotels near the Haram and smooth logistics.",
    icon: <GiFalconMoon className="text-3xl" />,
    color: "#f59e0b"
  },
  {
    title: "Exclusive Stays",
    desc: "From 5-star luxury to boutique comfort, we secure the best rates through our direct hotel partnerships.",
    icon: <LuHotel className="text-3xl" />,
    color: "#6366f1"
  },
];

export default function ChooseUsSection() {
  return (
    <section className="relative py-24 overflow-hidden bg-slate-50">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-60" />
      </div>

      <div className="main-container relative z-10 px-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row items-end justify-between gap-8 mb-20">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-12 bg-blue-600"></span>
              <p className="text-sm font-bold tracking-[0.2em] uppercase text-blue-600">
                The Shaheen Advantage
              </p>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-[1.15]">
              Experience Excellence with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-500">
                Shaheen Wings Travel
              </span>
            </h2>
          </div>
          <div className="hidden lg:block w-px h-24 bg-slate-200 mx-8"></div>
          <p className="max-w-md text-slate-500 text-lg leading-relaxed">
            We don’t just book trips; we craft experiences. Join thousands of satisfied travelers who trust us for seamless global exploration.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((item, i) => (
            <div
              key={i}
              className="group relative p-8 bg-white rounded-[32px] shadow-sm border border-slate-100 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-200/50 hover:-translate-y-2 overflow-hidden"
            >
              {/* Subtle Numbering Background */}
              <span className="absolute -right-4 -top-4 text-9xl font-black text-slate-50 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                {i + 1}
              </span>

              {/* Icon Container */}
              <div
                className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-500 group-hover:rotate-[10deg] group-hover:scale-110"
                style={{ background: `${item.color}15`, color: item.color }}
              >
                {item.icon}
                {/* Decorative Dot */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border-4" style={{ borderColor: item.color }} />
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-4 group-hover:text-blue-700 transition-colors">
                {item.title}
              </h3>

              <p className="text-slate-500 text-sm leading-relaxed relative z-10">
                {item.desc}
              </p>

              {/* Bottom Decorative Bar */}
              <div
                className="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500"
                style={{ background: item.color }}
              />
            </div>
          ))}
        </div>

        {/* Trust Bar */}
        <div className="mt-20 p-8 rounded-3xl bg-slate-900 flex flex-wrap items-center justify-around gap-8 text-white">

          {/* Item 1 */}
          <div className="flex items-center gap-4">
            <FaShieldAlt className="text-2xl text-blue-400" />
            <div>
              <p className="text-xs uppercase tracking-widest opacity-60">Security</p>
              <p className="font-bold">Fully Licensed Agency</p>
            </div>
          </div>

          <div className="w-px h-10 bg-white/10 hidden md:block" />

          {/* Item 2 */}
          <div className="flex items-center gap-4">
            <FaHeadset className="text-2xl text-emerald-400" />
            <div>
              <p className="text-xs uppercase tracking-widest opacity-60">Support</p>
              <p className="font-bold">24/7 Global Assistance</p>
            </div>
          </div>

          <div className="w-px h-10 bg-white/10 hidden md:block" />

          {/* Item 3 (NEW) */}
          <div className="flex items-center gap-4">
            <FaPlane className="text-2xl text-purple-400" />
            <div>
              <p className="text-xs uppercase tracking-widest opacity-60">Experience</p>
              <p className="font-bold">Seamless Travel Planning</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}