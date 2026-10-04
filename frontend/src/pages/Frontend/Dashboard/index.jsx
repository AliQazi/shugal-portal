import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowRight, ArrowUpRight, CalendarCheck2, ChevronLeft, ChevronRight, CircleAlert, Clock3, Compass, Plane, Sparkles, Ticket, XCircle } from "lucide-react";
import axiosInstance from "../../../api/axios";
import { groupTypes } from "../../../data/groupTypes";
import "./dashboard.css";

import madinaImg from "../../../assets/images/allgroupsbgg.jpg";
import jeddahImg from "../../../assets/images/jeddah.webp";
import mascatImg from "../../../assets/images/muscatbg.jpg";
import makkahImg from "../../../assets/images/ummrahbg.png";
import uaeImg from "../../../assets/images/uaebg.jpg";
import bahrainImg from "../../../assets/images/bahrainbg.webp";
import ukImg from "../../../assets/images/ukgroup.jpg";

const groupImages = {
  "All Groups": madinaImg,
  "UAE": uaeImg,
  "KSA": jeddahImg,
  "Muscat": mascatImg,
  "Umrah Packages": makkahImg,
  "Umrah Tickets": makkahImg,
  "Behrain": bahrainImg,
  "UK": ukImg,
};

const Dashboard = () => {
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    confirmed: 0,
    hold: 0,
    cancelled: 0,
  });

  const [indexCards, setIndexCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [cardsError, setCardsError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchUserBookings = async () => {
      try {
        const storedUser = sessionStorage.getItem("frontend_user");
        if (!storedUser) return;
        const user = JSON.parse(storedUser);
        const userId = user?._id || user?.id;
        if (!userId) return;

        const res = await axiosInstance.get("/bookings", {
          params: { userId }
        });
        if (res.data.success && Array.isArray(res.data.data)) {
          const bookings = res.data.data;
          const confirmed = bookings.filter(b => b.status === "confirmed").length;
          const hold = bookings.filter(b => b.status === "on hold" || b.status === "pending").length;
          const cancelled = bookings.filter(b => b.status === "cancelled").length;
          setSummary({ confirmed, hold, cancelled });
        }
      } catch (err) {
        setSummary({ confirmed: 0, hold: 0, cancelled: 0 });
      }
    };
    fetchUserBookings();
  }, []);

  useEffect(() => {
    const fetchIndexCards = async () => {
      setLoadingCards(true);
      try {
        const res = await axiosInstance.get("/specialOffer/getSpecialOffers");
        if (res.data.success) {
          setIndexCards(res.data.data);
        }
      } catch (err) {
        setCardsError("Failed to load index cards.");
      } finally {
        setLoadingCards(false);
      }
    };
    fetchIndexCards();
  }, []);

  useEffect(() => {
    if (indexCards.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === indexCards.length - 1 ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [indexCards]);

  const nextSlide = () => setCurrentIndex((prev) => (prev === indexCards.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrentIndex((prev) => (prev === 0 ? indexCards.length - 1 : prev - 1));

  return (
    <div className="agent-overview">
      <div className="agent-overview-notice"><Sparkles size={18} aria-hidden="true" /><span>Welcome to Stack Works Flow. We book comfort for you. Explore the latest Umrah and UAE special offers below.</span></div>

      <div className="agent-overview-heading">
        <div>
          <span className="agent-overview-eyebrow">Your agency workspace</span>
          <h1>Agency overview</h1>
          <p>Keep bookings in view and get straight to the journeys your clients need.</p>
        </div>
        <button type="button" className="agent-overview-primary" onClick={() => navigate("/dashboard/all-groups")}>Explore all groups <ArrowRight size={18} aria-hidden="true" /></button>
      </div>

      <div className="agent-overview-stats" aria-label="Booking status summary">
        <div className="agent-overview-stat agent-overview-stat-confirmed"><div className="agent-overview-stat-icon"><CalendarCheck2 size={23} aria-hidden="true" /></div><div><span>Confirmed bookings</span><strong>{summary.confirmed}</strong><small>Ready for your travellers</small></div></div>
        <div className="agent-overview-stat agent-overview-stat-hold"><div className="agent-overview-stat-icon"><Clock3 size={23} aria-hidden="true" /></div><div><span>Hold tickets</span><strong>{summary.hold}</strong><small>Awaiting confirmation</small></div></div>
        <div className="agent-overview-stat agent-overview-stat-cancelled"><div className="agent-overview-stat-icon"><XCircle size={23} aria-hidden="true" /></div><div><span>Cancelled tickets</span><strong>{summary.cancelled}</strong><small>Past cancellations</small></div></div>
      </div>

      <div className="agent-overview-content">
        <section className="agent-overview-groups" aria-labelledby="agent-groups-heading">
          <div className="agent-overview-section-heading"><div><span className="agent-overview-eyebrow">Plan the next trip</span><h2 id="agent-groups-heading">Browse group journeys</h2><p>Choose a destination or view the full inventory.</p></div><Compass size={23} aria-hidden="true" /></div>
          <div className="agent-overview-group-grid">
            {groupTypes.map((group) => (
              <button key={group.value} type="button" onClick={() => navigate(`/dashboard/${group.path}`)} className="agent-overview-group">
                <img src={groupImages[group.label]} alt="" loading="lazy" />
                <span className="agent-overview-group-shade" />
                <span className="agent-overview-group-label"><span>{group.label}</span><ArrowUpRight size={18} aria-hidden="true" /></span>
              </button>
            ))}
          </div>
        </section>

        <aside className="agent-overview-offers" aria-labelledby="agent-offers-heading">
          <div className="agent-overview-section-heading"><div><span className="agent-overview-eyebrow">Curated for your clients</span><h2 id="agent-offers-heading">Special offers</h2><p>Fresh opportunities from our travel team.</p></div><Ticket size={23} aria-hidden="true" /></div>
          {loadingCards ? (
            <div className="agent-overview-offer-state" role="status"><div className="agent-overview-offer-skeleton" /><span>Loading offers...</span></div>
          ) : cardsError ? (
            <div className="agent-overview-offer-state"><CircleAlert size={25} aria-hidden="true" /><strong>Offers could not be loaded</strong><span>{cardsError}</span></div>
          ) : indexCards.length === 0 ? (
            <div className="agent-overview-offer-state"><Plane size={27} aria-hidden="true" /><strong>No offers available right now</strong><span>New travel offers will appear here when they are published.</span></div>
          ) : (
            <div className="agent-overview-offer-card">
              {indexCards[currentIndex].image && <img className="agent-overview-offer-image" src={indexCards[currentIndex].image} alt="" />}
              <div className="agent-overview-offer-body"><span className="agent-overview-eyebrow">Special offer · {new Date(indexCards[currentIndex].createdAt).toLocaleDateString()}</span><h3>{indexCards[currentIndex].title}</h3></div>
              {indexCards.length > 1 && <div className="agent-overview-offer-controls"><button type="button" onClick={prevSlide} aria-label="Previous offer"><ChevronLeft size={18} /></button><span>{currentIndex + 1} / {indexCards.length}</span><button type="button" onClick={nextSlide} aria-label="Next offer"><ChevronRight size={18} /></button></div>}
            </div>
          )}
          <div className="agent-overview-help"><div className="agent-overview-help-icon"><Plane size={22} aria-hidden="true" /></div><div><strong>Need help planning a trip?</strong><p>Your travel team is ready to help with routes, fares, and packages.</p></div></div>
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
