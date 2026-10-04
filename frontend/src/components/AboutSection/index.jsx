import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import madinah from "../../assets/images/madina.webp";
import makkah from "../../assets/images/makkah.webp";
export default function AboutSection() {
  return (
    <section className="home-about home-section" id="about">
      <div className="home-width home-about-grid">
        <div className="home-about-images">
          <img src={madinah} alt="Masjid an-Nabawi in Madinah at dusk" loading="lazy" />
          <img src={makkah} alt="The Holy Kaaba in Makkah" loading="lazy" />
          <div className="home-about-note"><span>YOUR JOURNEY, OUR COMMITMENT</span><strong>Travel with confidence.</strong></div>
        </div>
        <div className="home-about-copy">
          <p className="home-eyebrow">GET TO KNOW Stack Works Flow</p>
          <h2>Thoughtful journeys.<br /><span>Personal service.</span></h2>
          <p>From your first enquiry to your return home, Stack Works Flow brings your travel plans together. We arrange flights, hotel stays, visa assistance, and Umrah packages with care and attention to the details.</p>
          <ul>
            <li><CheckCircle2 /> Flight reservations and international group tickets</li>
            <li><CheckCircle2 /> Umrah packages and carefully selected stays</li>
            <li><CheckCircle2 /> Visa and documentation assistance</li>
            <li><CheckCircle2 /> Dedicated support before and after booking</li>
          </ul>
          <a href="#contact" className="home-button home-button-blue">Talk to our travel team <ArrowUpRight size={18} /></a>
        </div>
      </div>
    </section>
  );
}
