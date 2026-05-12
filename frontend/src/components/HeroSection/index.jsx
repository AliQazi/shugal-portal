import { Link } from "react-router-dom";
import { HiArrowRight } from "react-icons/hi"; // Standard icon
import heroVid from "../../assets/videos/herovid2.mp4";
import makkahImg from "../../assets/images/ummrahbg.png";
import mascatImg from "../../assets/images/muscatbg.jpg";
import uaeImg from "../../assets/images/uaebg.jpg";
// import bahrainImg from "../../assets/images/bahrainbg.webp";
import jeddahImg from "../../assets/images/jeddah.webp";
import ukImg from "../../assets/images/ukgroup.jpg";
import madinaImg from "../../assets/images/allgroupsbgg.jpg";
import umrahticket from "../../assets/images/umrahticketing.webp";
import bahrain from "../../assets/images/bahrainbg.avif";
import { groupTypes } from "../../data/groupTypes";

const groupImages = {
  "All Groups": madinaImg,
  "Umrah Makkah & Madina": makkahImg,
  "Umrah Tickets": umrahticket,
  "Behrain": bahrain,
  "UAE": uaeImg,
  "KSA": jeddahImg,
  "Muscat": mascatImg,
  "UK": ukImg,
};

export default function HeroSection() {
  return (
    <section
      id="hero-section"
      className="relative min-h-screen flex flex-col justify-center pt-28 pb-20 overflow-hidden bg-black"
    >
      {/* 1. CINEMATIC BACKGROUND */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      >
        <source src={heroVid} type="video/mp4" />
      </video>

      {/* Dynamic Overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90"></div>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>

      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6">

        {/* 2. MODERN CENTERED HEADER */}
        <div className="text-center mb-15 mt-10 space-y-4">
          {/* <div className="inline-block px-4 py-1 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-white/70 text-[10px] uppercase tracking-[0.4em] font-bold">
            Established Excellence
          </div> */}
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter uppercase italic">
            Fly <span className="text-[#0090c5]">Naveed</span>
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-white/50"></div>
            <p className="text-lg md:text-xl text-gray-300 font-medium tracking-widest uppercase">
              Travels & Tours
            </p>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-white/50"></div>
          </div>
        </div>

        {/* 3. UNIFORM PREMIUM GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 p-8">
          {groupTypes.map((group) => (
            <Link
              key={group.value}
              to={`/${group.path}`}
              className={`group relative flex flex-col ${group.label === "All Groups" ? 'col-span-1' : ''}`}
            >
              {/* Image Container with Floating Effect */}
              <div className="relative w-full h-60 overflow-hidden rounded-t-[2rem] rounded-b-2xl shadow-2xl transition-transform duration-500 group-hover:-translate-y-4">
                <img
                  src={groupImages[group.label]}
                  alt={group.label}
                  className="h-full! w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Soft Glow behind the image */}
                <div className="absolute -inset-2 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>

              {/* Floating Glass Label */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[85%] p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl transition-all duration-500 group-hover:bg-white/20">
                <p className="text-xs uppercase tracking-widest text-white/60 mb-1">Explore Now</p>
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-bold text-lg">{group.label}</h3>
                  <div className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center text-sm group-hover:rotate-45 transition-transform">
                    ↗
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {/* 4. OPTIONAL BOTTOM STATS / TRUST BAR */}
        <div className="mt-20 flex flex-wrap justify-center gap-10 md:gap-20 opacity-50">
          {['24/7 Support', 'Best Rates', 'Verified Visas', 'Instant Booking'].map((item) => (
            <div key={item} className="flex items-center gap-2 text-white text-[11px] uppercase tracking-[0.2em] font-semibold">
              <span className="w-1 h-1 bg-[#649abe] rounded-full"></span>
              {item}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}