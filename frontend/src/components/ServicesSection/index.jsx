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
  { id: 1, title: "Air Tickets", description: "Seamless sky travel. We arrange safe, comfortable air tickets and premium lounge access for your journey.", image: service1 },
  { id: 2, title: "Umrah Packages", description: "Spiritual journeys crafted with care. Affordable group deals with top-tier service quality.", image: service2 },
  { id: 3, title: "Visa Services", description: "Skip the paperwork. Expert guidance and efficient processing for all international destinations.", image: service3 },
  { id: 4, title: "Hotel Packages", description: "Your home away from home. Curated stays ranging from boutique gems to 5-star luxury.", image: service4 },
  { id: 5, title: "Travel Consultancy", description: "Personalized itineraries and insider tips to turn your dream vacation into reality.", image: service5 },
  { id: 6, title: "Meet & Assist", description: "VIP airport treatment. Effortless transitions from the curb to the cabin.", image: service6 },
];

export default function ServicesSection() {
  return (
    <section className="relative py-24 bg-[#f8fafc] overflow-hidden">
      {/* --- Decorative Elements --- */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white to-transparent z-0" />
      
      {/* Background Blobs */}
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] rounded-full bg-indigo-50/50 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* --- Header Section --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            {/* <span 
              className="inline-block px-4 py-1.5 mb-4 text-xs font-bold tracking-[0.2em] uppercase rounded-full bg-white shadow-sm border border-slate-100"
              style={{ color: theme.colors.accent }}
            >
              Our Expertise
            </span> */}
            <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
              Premium Travel <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
                Solutions for You
              </span>
            </h2>
          </div>
          <p className="text-slate-500 max-w-xs text-lg leading-relaxed border-l-2 border-slate-200 pl-6">
            We handle the details so you can focus on the memories. Explore our specialized services.
          </p>
        </div>

        {/* --- Services Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-8">
          {services.map((service, index) => (
            <div
              key={service.id}
              className="group relative flex flex-col"
            >
              {/* Image Container with Floating Effect */}
              <div className="relative h-72 w-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 group-hover:-translate-y-3">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full! object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                
                {/* Floating Service Number */}
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold border border-white/30">
                  0{index + 1}
                </div>
              </div>

              {/* Content Box - Overlapping the image slightly */}
              <div className="relative -mt-12 mx-4 p-6 bg-white rounded-xl shadow-xl border border-slate-50 transition-all duration-500 group-hover:shadow-indigo-100">
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                  {service.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2">
                  {service.description}
                </p>
                
                <button className="flex items-center gap-2 text-sm font-bold text-slate-900 group/btn">
                  <span className="relative">
                    Explore Details
                    <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-blue-600 transition-all duration-300 group-hover/btn:w-full" />
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center transition-colors group-hover/btn:bg-blue-600 group-hover/btn:text-white">
                    →
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Aesthetic Mosque Background --- */}
      <div className="absolute bottom-0 right-0 w-full h-full flex justify-end items-end opacity-[0.03] pointer-events-none select-none">
        <img
          src={mosque}
          alt="mosque"
          className="w-1/2 translate-y-1/4 translate-x-1/4"
        />
      </div>

      <style jsx>{`
        /* Smooth Entrance Animation for Grid Items */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .grid > div {
          animation: fadeUp 0.8s ease backwards;
        }
        
        .grid > div:nth-child(1) { animation-delay: 0.1s; }
        .grid > div:nth-child(2) { animation-delay: 0.2s; }
        .grid > div:nth-child(3) { animation-delay: 0.3s; }
        .grid > div:nth-child(4) { animation-delay: 0.4s; }
        .grid > div:nth-child(5) { animation-delay: 0.5s; }
        .grid > div:nth-child(6) { animation-delay: 0.6s; }
      `}</style>
    </section>
  );
}