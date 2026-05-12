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
  "Umrah Makkah & Madina": makkahImg,
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
      setCardsError(null);

      try {
        const res = await axiosInstance.get("/specialOffer/getSpecialOffers");

        if (res.data.success) {
          setIndexCards(res.data.data);
        } else {
          setIndexCards([]);
        }
      } catch (err) {
        console.error(err);
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
      setCurrentIndex((prev) =>
        prev === indexCards.length - 1 ? 0 : prev + 1
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [indexCards]);

  const handleCategoryClick = (group) => {
    navigate(`/dashboard/${group.path}`);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) =>
      prev === indexCards.length - 1 ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? indexCards.length - 1 : prev - 1
    );
  };

  return (
    <>
      {/* News Headline Bar with Marquee Animation */}
      <div className="w-full m-0!  bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 text-white py-2 overflow-hidden shadow-md mb-4 relative flex items-center">

        <div className="whitespace-nowrap font-semibold tracking-wide animate-marquee">
          Welcome to Shaheen Wings Travels. We book comfort for you &nbsp; — &nbsp; Check out our latest Umrah and UAE Special Offers below!
        </div>

        <style dangerouslySetInnerHTML={{
          __html: `
    @keyframes marquee {
      0% {
        transform: translateX(100%);
      }
      100% {
        transform: translateX(-100%);
      }
    }

    .animate-marquee {
      display: inline-block;
      animation: marquee 20s linear infinite;
    }
  ` }} />
      </div>

      <div className="w-full min-h-screen p-4 md:p-8">
        <TopBar title={"Manage your Agent Dashboard"} />

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl p-6 text-center shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 blur-2xl opacity-30"></div>
            <div className="relative z-10">
              <div className="text-3xl font-extrabold">{summary.confirmed}</div>
              <div className="mt-2 font-bold text-sm uppercase tracking-wider opacity-80">
                Confirmed Bookings
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-6 text-center shadow-lg bg-gradient-to-br from-amber-400 to-yellow-500 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 blur-2xl opacity-30"></div>
            <div className="relative z-10">
              <div className="text-3xl font-extrabold">{summary.hold}</div>
              <div className="mt-2 font-bold text-sm uppercase tracking-wider opacity-80">
                Hold Tickets
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-6 text-center shadow-lg bg-gradient-to-br from-red-500 to-rose-600 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 blur-2xl opacity-30"></div>
            <div className="relative z-10">
              <div className="text-3xl font-extrabold">{summary.cancelled}</div>
              <div className="mt-2 font-bold text-lg uppercase tracking-wider opacity-80">
                Cancelled Tickets
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {groupTypes.map((group) => (
                <div
                  key={group.value}
                  onClick={() => handleCategoryClick(group)}
                  className="group relative cursor-pointer"
                >
                  <div className="relative h-48 overflow-hidden rounded-2xl shadow-xl">
                    <img
                      src={groupImages[group.label]}
                      alt={group.label}
                      className="h-full w-full object-cover group-hover:scale-110 transition duration-500"
                    />
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-md rounded-xl p-3 text-white flex justify-between items-center">
                    <h3 className="font-bold">{group.label}</h3>
                    <span className="group-hover:rotate-45 transition">↗</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:max-w-md h-full relative flex items-center justify-center">
            {loadingCards ? (
              <div>Loading...</div>
            ) : cardsError ? (
              <div className="text-red-500">{cardsError}</div>
            ) : indexCards.length === 0 ? (
              <div className="text-gray-400">No Offers Found</div>
            ) : (
              <div className="relative w-full px-10">
                <button
                  onClick={prevSlide}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-100"
                >
                  ←
                </button>

                <div className="mx-auto w-full max-w-[420px] bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-500">
                  <img
                    src={indexCards[currentIndex].image}
                    alt={indexCards[currentIndex].title}
                    className="w-full h-40 object-cover"
                  />

                  <div className="p-4 text-center">
                    <h3 className="font-bold text-gray-800 text-lg">
                      {indexCards[currentIndex].title}
                    </h3>

                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(indexCards[currentIndex].createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={nextSlide}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-100"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;