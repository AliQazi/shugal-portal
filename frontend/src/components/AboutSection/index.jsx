import React from "react";
import aboutImg from "../../assets/images/bahrain.webp";
import hangingLights from "../../assets/images/hanging-lights.png";
import moon from "../../assets/images/moon.png";
import dots from "../../assets/images/dots.svg";
import { BsArrowRight } from "react-icons/bs";
import { theme } from "../../theme/theme";

export default function AboutSection() {
  return (
    <section
      className="relative overflow-hidden py-20"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.background}, ${theme.colors.backgroundDark})`,
      }}
    >
      {/* Decorations */}
      <img
        src={
          "https://ex-coders.com/html/turmet/assets/img/about/plane-shape.png"
        }
        alt=""
        className="hidden lg:block absolute top-8 -right-0 w-80 z-0"
      />
      <img
        src={"https://ex-coders.com/html/turmet/assets/img/destination/car.png"}
        alt=""
        className="hidden md:block absolute bottom-12 -left-0 w-56 z-0"
      />
      <img
        src={"https://ex-coders.com/html/turmet/assets/img/plane-shape2.png"}
        alt=""
        className="absolute -top-5 -left-5 w-44 z-0"
      />

      <div className="main-container relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* LEFT - IMAGE WITH ANIMATED GRADIENT BORDER */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto lg:mx-0 max-w-130">
              {/* Animated Gradient Border (Circular Moving Glow) */}
              <div
                className="absolute -inset-4 rounded-[28px]"
                style={{
                  background: `conic-gradient(
                    from 0deg,
                    transparent 0deg,
                    ${theme.colors.primaryLight} 40deg,
                    ${theme.colors.accentLight} 90deg,
                    ${theme.colors.ublGradientEnd} 160deg,
                    ${theme.colors.primaryLight} 220deg,
                    transparent 300deg
                  )`,
                  backgroundSize: "400% 400%",
                  animation: "borderGlowMove 9s linear infinite",
                  filter: "blur(6px)",
                  opacity: 0.85,
                }}
              />

              {/* Main Image Container */}
              <div className="relative rounded-[22px] overflow-hidden border-4 border-white shadow-2xl">
                <img
                  src={aboutImg}
                  alt="About World Fly Travel"
                  className="w-full h-auto aspect-[16/13] object-cover"
                />

                {/* Bottom Overlay */}
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

                <div className="absolute bottom-8 left-8">
                  <h2 className="text-4xl font-bold text-white drop-shadow-lg">
                    About Us
                  </h2>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT - CONTENT CARD */}
          <div className="lg:col-span-7">
            <div
              className="bg-white rounded-3xl p-10 lg:p-12 shadow-xl border border-slate-100 h-full"
              style={{ boxShadow: theme.shadows.xl }}
            >
              <p
                className="uppercase text-sm font-semibold tracking-widest mb-3"
                style={{ color: theme.colors.accent }}
              >
                ABOUT COMPANY
              </p>

              <h2
                className="text-2xl font-bold leading-tight mb-8 tracking-tight"
                style={{
                  background: theme.colors.ublGradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Trusted Travel Services with Professional Excellence
              </h2>

              <div
                className="w-14 h-1 rounded-full mb-8"
                style={{ background: theme.colors.ublGradient }}
              />

              <div
                className="space-y-7 text-[16.5px] leading-relaxed"
                style={{ color: theme.colors.textSecondary }}
              >
                <p>
                  If you are looking for a dependable and professional travel
                  partner, World Fly Travel and Tours (Pvt Ltd) is your premier
                  choice. With years of industry expertise, we have built a
                  reputation for excellence and integrity in every journey we
                  plan.
                </p>

                <div>
                  <span
                    className="font-semibold text-lg block mb-2"
                    style={{ color: theme.colors.textPrimary }}
                  >
                    Expert Travel Solutions
                  </span>
                  Our experienced team ensures smooth bookings, route planning,
                  and exclusive deals for all travelers.
                </div>

                <div>
                  <span
                    className="font-semibold text-lg block mb-2"
                    style={{ color: theme.colors.textPrimary }}
                  >
                    Personalized Support
                  </span>
                  We focus on individual customer needs, providing one-on-one
                  assistance to make every journey stress-free.
                </div>
              </div>

              <button
                className="mt-10 flex items-center gap-3 px-9 py-4 rounded-2xl font-semibold text-base transition-all hover:shadow-lg hover:-translate-y-0.5"
                style={{
                  background: theme.colors.ublGradient,
                  color: "#fff",
                }}
              >
                Discover More
                <BsArrowRight className="text-xl transition-transform duration-300 hover:translate-x-2" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Circular Gradient Border Animation */}
      <style jsx>{`
        @keyframes borderGlowMove {
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
