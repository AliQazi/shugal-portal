import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axiosInstance from "../../../api/axios";
import { groupTypes } from "../../../data/groupTypes";
import TopBar from "../../../components/TopBar/TopBar";

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
    <>
      {/* News Headline Bar */}
      <div className="w-full bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 text-white py-2 overflow-hidden shadow-md mb-4 relative flex items-center">
        <div className="whitespace-nowrap font-semibold tracking-wide animate-marquee">
          Welcome to Shaheen Wings Travels. We book comfort for you &nbsp; — &nbsp; Check out our latest Umrah and UAE Special Offers below!
        </div>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
            .animate-marquee { display: inline-block; animation: marquee 20s linear infinite; }
          ` }} />
      </div>

      <div className="w-full p-4 md:p-8 mx-auto max-w-[1600px]">
        <TopBar title={"Manage your Agent Dashboard"} />

        {/* --- Summary Section (3 Cards) --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl p-6 text-center shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white relative overflow-hidden h-32 flex flex-col justify-center">
            <div className="absolute inset-0 bg-white/10 blur-2xl opacity-30"></div>
            <div className="relative z-10">
              <div className="text-3xl font-extrabold">{summary.confirmed}</div>
              <div className="mt-2 font-bold text-xs uppercase tracking-wider opacity-80">Confirmed Bookings</div>
            </div>
          </div>

          <div className="rounded-2xl p-6 text-center shadow-lg bg-gradient-to-br from-amber-400 to-yellow-500 text-white relative overflow-hidden h-32 flex flex-col justify-center">
            <div className="absolute inset-0 bg-white/10 blur-2xl opacity-30"></div>
            <div className="relative z-10">
              <div className="text-3xl font-extrabold">{summary.hold}</div>
              <div className="mt-2 font-bold text-xs uppercase tracking-wider opacity-80">Hold Tickets</div>
            </div>
          </div>

          <div className="rounded-2xl p-6 text-center shadow-lg bg-gradient-to-br from-red-500 to-rose-600 text-white relative overflow-hidden h-32 flex flex-col justify-center">
            <div className="absolute inset-0 bg-white/10 blur-2xl opacity-30"></div>
            <div className="relative z-10">
              <div className="text-3xl font-extrabold">{summary.cancelled}</div>
              <div className="mt-2 font-bold text-xs uppercase tracking-wider opacity-80">Cancelled Tickets</div>
            </div>
          </div>
        </div>

        {/* --- Lower Section (Aligned with Summary Cards) --- */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left: Group Categories (Takes 2/3 width on LG) */}
          <div className="lg:w-2/3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {groupTypes.map((group) => (
                <div
                  key={group.value}
                  onClick={() => navigate(`/dashboard/${group.path}`)}
                  className="group relative cursor-pointer"
                >
                  <div className="relative h-48 overflow-hidden rounded-2xl shadow-md border border-gray-100">
                    <img
                      src={groupImages[group.label]}
                      alt={group.label}
                      className="h-full w-full object-cover group-hover:scale-110 transition duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 bg-white/10 backdrop-blur-md rounded-xl p-3 text-white flex justify-between items-center border border-white/20">
                    <h3 className="font-bold text-sm tracking-wide">{group.label}</h3>
                    <span className="text-xl group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">↗</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Special Offers Carousel (Takes 1/3 width on LG) */}
          <div className="lg:w-1/3 flex">
            {loadingCards ? (
              <div className="w-full min-h-[100px] flex items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed">Loading...</div>
            ) : indexCards.length === 0 ? (
              <div className="w-full min-h-[100px] flex items-center justify-center bg-gray-50 rounded-2xl">No Offers</div>
            ) : (
              <div className="relative w-full group">
                <div className=" w-full bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col border border-gray-100">
                  <div className="relative flex-1 overflow-hidden">
                    <img
                      src={indexCards[currentIndex].image}
                      alt={indexCards[currentIndex].title}
                      className="w-full h-full object-cover"
                    />
                    {/* Navigation Buttons inside the card on hover */}
                    <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={prevSlide} className="bg-white/90 p-2 rounded-full shadow hover:bg-white">←</button>
                      <button onClick={nextSlide} className="bg-white/90 p-2 rounded-full shadow hover:bg-white">→</button>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-white">
                    <div className="flex justify-between items-start mb-1">
                       <h3 className="font-black text-gray-800 text-lg uppercase leading-tight">
                        {indexCards[currentIndex].title}
                      </h3>
                    </div>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                      Special Offer • {new Date(indexCards[currentIndex].createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default Dashboard;