import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Headphones, Menu, Plane, X } from "lucide-react";
import logo from "../../assets/images/logo2.png";
import madinah from "../../assets/images/madina.webp";
import makkah from "../../assets/images/makkah.webp";
import destination1 from "../../assets/images/hero1.webp";
import destination2 from "../../assets/images/hero2.webp";
import destination3 from "../../assets/images/hero3.webp";

const slides = [
  { image: madinah, title: "A journey closer to", accent: "what matters.", destination: "Madinah, Saudi Arabia", description: "Discover Umrah packages, group fares, and thoughtfully arranged travel with Stack Works Flow." },
  { image: makkah, title: "Begin your journey to", accent: "the Holy Land.", destination: "Makkah, Saudi Arabia", description: "Plan your sacred journey with carefully selected stays, convenient flights, and personal travel support." },
  { image: destination1, title: "New destinations.", accent: "More possibilities.", destination: "Discover the world", description: "Find your next route with our international group tickets and dedicated travel team." },
  { image: destination2, title: "Your next chapter", accent: "starts here.", destination: "Journeys with Stack Works Flow", description: "From flight reservations to hotel stays, bring every part of your journey together." },
  { image: destination3, title: "Go further with", accent: "Stack Works Flow.", destination: "Travel, thoughtfully arranged", description: "Explore our destinations and let our team help you choose the right travel options." },
];

export default function HomeIntro({ user }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const slide = slides[activeSlide];
  return (
    <section className="home-intro" id="home-top" aria-label="Welcome to Stack Works Flow">
      <img className="home-intro-image" src={slide.image} alt={slide.destination} fetchPriority="high" />
      <div className="home-intro-shade" />
      {!user && (
        <header className="home-navigation">
          <a href="#home-top" className="home-brand" aria-label="Stack Works Flow home"><img src={logo} alt="Stack Works Flow" /></a>
          <nav className="home-desktop-links" aria-label="Main navigation">
            <a href="#home-top">Home</a><a href="#destinations">Group tickets</a><a href="#services">Our services</a><a href="#about">About us</a><a href="#contact">Contact</a>
          </nav>
          <div className="home-account-links"><Link to="/auth/login" className="home-button home-button-glass">Agent login</Link><Link to="/auth/register" className="home-button home-button-white">Become a partner <ArrowUpRight size={16} /></Link></div>
          <button className="home-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="home-mobile-menu">{menuOpen ? <X /> : <Menu />}</button>
          {menuOpen && <nav id="home-mobile-menu" className="home-mobile-menu" aria-label="Mobile navigation">
            <a href="#home-top" onClick={() => setMenuOpen(false)}>Home</a><a href="#destinations" onClick={() => setMenuOpen(false)}>Group tickets</a><a href="#services" onClick={() => setMenuOpen(false)}>Our services</a><a href="#about" onClick={() => setMenuOpen(false)}>About us</a><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a><Link to="/auth/login">Agent login</Link><Link to="/auth/register">Become a partner <ArrowUpRight size={16} /></Link>
          </nav>}
        </header>
      )}
      <div className="home-intro-content home-width">
        <p className="home-eyebrow home-eyebrow-light"><Plane size={15} /> YOUR TRAVEL PARTNER, EVERY STEP OF THE WAY</p>
        <h1>{slide.title}<br /><span>{slide.accent}</span></h1>
        <p className="home-intro-description">{slide.description}</p>
        <div className="home-intro-actions">
          {user ? <Link to="/dashboard" className="home-button home-button-white">Open agency portal <ArrowRight size={18} /></Link> : <Link to="/auth/login" className="home-button home-button-white">Start your journey <ArrowRight size={18} /></Link>}
          <a href="#destinations" className="home-button home-button-glass">Explore group tickets</a>
        </div>
      </div>
      <div className="home-intro-bottom home-width">
        <div className="home-slide-controls" aria-label="Destination slideshow">
          <button aria-label="Previous destination" onClick={() => setActiveSlide((activeSlide + slides.length - 1) % slides.length)}><ChevronLeft size={18} /></button>
          {slides.map((item, index) => <button key={item.image} className={`home-slide-dot ${index === activeSlide ? "is-active" : ""}`} aria-label={`Show destination ${index + 1}`} aria-pressed={index === activeSlide} onClick={() => setActiveSlide(index)} />)}
          <button aria-label="Next destination" onClick={() => setActiveSlide((activeSlide + 1) % slides.length)}><ChevronRight size={18} /></button>
        </div>
        <a href="#contact" className="home-team-link"><span className="home-team-icon"><Headphones size={22} /></span><span><small>REAL PEOPLE. PERSONAL SUPPORT.</small><strong>Meet your travel team</strong></span><ArrowUpRight size={20} /></a>
      </div>
    </section>
  );
}
