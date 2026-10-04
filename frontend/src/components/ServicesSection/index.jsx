import React, { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Plane, Moon, ShieldCheck, BedDouble, Map, Users } from "lucide-react";
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
  const [activeService, setActiveService] = useState(0);
  const service = services[activeService];
  const icons = [Plane, Moon, ShieldCheck, BedDouble, Map, Users];
  const ServiceIcon = icons[activeService];
  return (
    <section className="home-services home-section" id="services">
      <div className="home-width">
        <div className="home-section-heading">
          <div><p className="home-eyebrow home-eyebrow-light">THE TRAVEL DESK</p><h2>Every detail covered.<br />Every journey, considered.</h2></div>
          <p className="home-services-intro">Flights, stays, and everything in between.<br />Our team brings it all together for you.</p>
        </div>
        <div className="home-service-ticket" id="home-service-panel" aria-live="polite">
          <div className="home-service-photo"><img src={service.image} alt={service.title} loading="lazy" /><div><p className="home-eyebrow home-eyebrow-light">Stack Works Flow</p><h3>{service.title}</h3></div></div>
          <div className="home-service-copy">
            <div className="home-ticket-top"><div><p className="home-eyebrow">YOUR TRAVEL, TAKEN CARE OF</p><small>Service {activeService + 1} of {services.length}</small></div><span><ServiceIcon size={24} /></span></div>
            <div className="home-ticket-route"><div><small>FROM</small><strong>Your plans</strong></div><span><Plane size={22} /></span><div><small>TO</small><strong>Your destination</strong></div></div>
            <p>{service.description}</p>
            <div className="home-ticket-note"><ShieldCheck size={20} /><span>Personal assistance from enquiry to departure.</span></div>
            <div className="home-service-actions"><div><button aria-label="Previous service" onClick={() => setActiveService((activeService + services.length - 1) % services.length)}><ChevronLeft size={20} /></button><button aria-label="Next service" onClick={() => setActiveService((activeService + 1) % services.length)}><ChevronRight size={20} /></button></div><a href="#contact" className="home-button home-button-blue">Explore details <ArrowRight size={17} /></a></div>
          </div>
        </div>
        <div className="home-service-tabs" aria-label="Choose a travel service">
          {services.map((item, index) => { const Icon = icons[index]; return <button key={item.id} className={index === activeService ? "is-active" : ""} aria-pressed={index === activeService} aria-controls="home-service-panel" onClick={() => setActiveService(index)}><Icon size={22} /><span>{item.title}</span></button>; })}
        </div>
      </div>
    </section>
  );
}
