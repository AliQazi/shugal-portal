import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import makkahImg from "../../assets/images/makkah.webp";
import mascatImg from "../../assets/images/mascat.webp";
import uaeImg from "../../assets/images/uae.webp";
import jeddahImg from "../../assets/images/jeddah.webp";
import ukImg from "../../assets/images/ukgroup.jpg";
import madinaImg from "../../assets/images/madina.webp";
import umrahticket from "../../assets/images/umrahticketing.webp";
import bahrain from "../../assets/images/bahrainbg.avif";
import { groupTypes } from "../../data/groupTypes";

const groupImages = {
  "All Groups": madinaImg,
  "Umrah Packages": makkahImg,
  "Umrah Tickets": umrahticket,
  "Behrain": bahrain,
  "UAE": uaeImg,
  "KSA": jeddahImg,
  "Muscat": mascatImg,
  "UK": ukImg,
};

export default function HeroSection({ isGuest = false }) {
  return (
    <section id="destinations" className="home-destinations home-section">
      <div className="home-width">
        <div className="home-section-heading">
          <div><p className="home-eyebrow">POPULAR DESTINATIONS</p><h2>Where will your next journey take you?</h2></div>
          <Link to={isGuest ? "/auth/login" : "/all-groups"} className="home-text-link">Explore all groups <ArrowRight size={18} /></Link>
        </div>
        <div className="home-destination-grid">
          {groupTypes.map((group) => (
            <Link key={group.value} to={isGuest ? "/auth/login" : `/${group.path}`} className="home-destination-card">
              <div className="home-destination-photo"><img src={groupImages[group.label]} alt={group.label} loading="lazy" /><span><ArrowUpRight size={19} /></span></div>
              <div className="home-destination-label"><span className="home-destination-pin"><MapPin size={18} /></span><div><small>EXPLORE WITH Stack Works Flow</small><h3>{group.label}</h3></div></div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
