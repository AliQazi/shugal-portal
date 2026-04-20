import { Link } from "react-router-dom";
import heroVid from "../../assets/videos/hero.mp4";
import makkahImg from "../../assets/images/makkah.webp";
import ukImg from "../../assets/images/uk.webp";
import qatarImg from "../../assets/images/qatar.jpg";
import mascatImg from "../../assets/images/mascat.webp";
import uaeImg from "../../assets/images/uae.webp";
import bahrainImg from "../../assets/images/bahrain.webp";
import jeddahImg from "../../assets/images/jeddah.webp";
import madinaImg from "../../assets/images/madina.webp";
import { groupTypes } from "../../data/groupTypes";

const groupImages = {
  "All Groups": madinaImg,
  "UAE Groups": uaeImg,
  "KSA Groups": jeddahImg,
  "Bahrain Groups": bahrainImg,
  "Muscat Groups": mascatImg,
  "Qatar Groups": qatarImg,
  "UK Groups": ukImg,
  "Umrah Groups": makkahImg,
};

export default function HeroSection() {
  return (
    <section className="relative min-h-[85vh] flex items-center mt-16 md:mt-20 overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={heroVid} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 main-container px-5 py-12 md:py-20 w-full">
        {/* Title */}
        <div className="flex justify-center mb-16">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-2xl">
              World Fly
            </h1>
            <p className="text-xl md:text-2xl mt-3 font-medium text-white">
              Travels & Tours (Pvt Ltd )
            </p>
            <div className="w-24 h-1 bg-white/40 mx-auto mt-6 rounded-full"></div>
          </div>
        </div>

        {/* Group Cards - Fixed Height */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {groupTypes.map((group) => (
            <Link
              key={group.value}
              to={`/${group.path}`}
              className="group relative h-50 rounded-3xl overflow-hidden shadow-xl shadow-black/50 transition-all duration-500 hover:scale-105 hover:-translate-y-2"
            >
              {/* Image - Full Height & Width */}
              <img
                style={{ height: "100%" }}
                src={groupImages[group.label]}
                alt={group.label}
                className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
              />

              {/* Bottom Gradient Overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <div
                  className="inline-block px-5 py-1.5 rounded-full text-sm font-semibold mb-3"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.18)",
                    backdropFilter: "blur(10px)",
                    color: "#ffffff",
                  }}
                >
                  {group.label}
                </div>

                <p className="text-white text-lg font-semibold tracking-wide">
                  Explore Now
                </p>
              </div>

              {/* Hover Border */}
              <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/40 rounded-3xl transition-all duration-500" />
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Fade */}
      {/* <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-gray-50 to-transparent z-20" /> */}
    </section>
  );
}
