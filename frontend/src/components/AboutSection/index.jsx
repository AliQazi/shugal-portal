import React from "react";
import aboutImg from "../../assets/images/ABOUTUSIMAGE.webp";
import { theme } from "../../theme/theme";

export default function AboutSection() {
  return (
    <section className="py-16 bg-white font-sans">
      <div className="max-w-7xl mx-auto px-6">
        {/* --- TOP SECTION: WHY CHOOSE US --- */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-[1.5px] w-12 bg-[#1a417a]"></div>
            <h2 className="text-[#1a417a] font-extrabold text-lg uppercase tracking-wider">
              Why Choose Us
            </h2>
            <div className="h-[1.5px] w-12 bg-[#1a417a]"></div>
          </div>
          <p className="max-w-4xl font-bold mx-auto text-gray-500 leading-relaxed text-sm md:text-base">
            Fly Naveed Travel & TourTravels is a leading online travel agency committed to delivering exceptional travel experiences. We specialize in a wide range of services, including:
             Flight Reservations & Airline Tickets
             Hotel Booking Services
             Visa Assistance
             Umrah & Hajj Packages
            We take pride in offering highly competitive rates without compromising on quality. Our reputation is built on reliability, customer satisfaction, and outstanding after-sales support—ensuring your journey remains smooth from start to finish.
          </p>
        </div>

        {/* --- BOTTOM SECTION: OVERLAPPING DESIGN --- */}
        <div className="relative flex flex-col lg:flex-row items-center justify-center">

          {/* LEFT: IMAGE COLLAGE (Circular) */}
          <div className="relative z-0 w-full lg:w-1/2 flex justify-center lg:justify-end">
            <div className="w-[350px] h-[350px] md:w-[500px] md:h-[500px] rounded-full overflow-hidden  shadow-xl">
              <img
                src={aboutImg}
                alt="Travel Destinations"
                className="w-full! h-full! object-cover"
              />
            </div>
            {/* Note: In a real project, this img would be a transparent PNG collage 
                like in your screenshot. If aboutImg is a standard photo, the 
                rounded-full class makes it circular to match the vibe. */}
          </div>

          {/* RIGHT: BLUE CONTENT BOX (Overlapping) */}
          <div className="relative z-10 w-full  lg:w-3/5 mt-[-50px] lg:mt-0 lg:ml-[-100px]">
            <div className="bg-[#0090c5] p-8 rounded-1xl md:p-14 text-white shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-[2px] w-10 bg-white"></div>
                <span className="font-bold uppercase tracking-widest text-sm">
                  Welcome
                </span>
              </div>

              <h3 className="text-3xl md:text-5xl font-black mb-8 leading-tight uppercase tracking-tight">
                Go Travel. Discover the Best, Remember the Experience!!
              </h3>

              <div className="space-y-5 text-sm md:text-base leading-relaxed opacity-90">
                <p>
                  At Fly Naveed Travel & TourTravels, we redefine the art of travel by curating exceptional journeys tailored to your expectations. Our commitment lies in offering exclusive deals and thoughtfully crafted travel solutions that combine luxury, comfort, and value.
                </p>
                <p>
                  With access to highly competitive fares across global destinations, we ensure that every journey begins with sophistication and ease. What truly sets us apart is our dedication to impeccable after-sales service—because your experience matters long after your booking is complete.
                </p>
                <p>
                  For those who seek a personalized touch, our advanced filters allow you to refine your journey by selecting preferred airlines and travel options—ensuring every detail aligns with your expectations.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}