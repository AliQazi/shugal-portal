import { Link } from "react-router-dom";
import {
  FaUniversity,
  FaMoneyBillWave,
  FaUsers,
  FaBook,
  FaUserCircle,
  FaArrowRight,
} from "react-icons/fa";
import { theme } from "../../../theme/theme";
import TopBar from "../../../components/TopBar/TopBar";

const Dashboard = () => {
  const cards = [
    {
      title: "All Groups",
      description: "View and manage all group bookings",
      icon: <FaUsers />,
      link: "/dashboard/all-groups",
      style: theme.cards.groups,
      colors: {
        corner1: "bg-blue-100",
        corner2: "bg-blue-50",
        shadow: "hover:shadow-blue-100",
        hover: "group-hover:text-blue-700",
        cta: "text-blue-600",
      },
    },
    {
      title: "Bank Details",
      description: "View bank account information",
      icon: <FaUniversity />,
      link: "/dashboard/banks",
      style: theme.cards.bank,
      colors: {
        corner1: "bg-green-100",
        corner2: "bg-green-50",
        shadow: "hover:shadow-green-100",
        hover: "group-hover:text-green-700",
        cta: "text-green-600",
      },
    },
    {
      title: "Payment",
      description: "Make payments and view history",
      icon: <FaMoneyBillWave />,
      link: "/dashboard/payment",
      style: theme.cards.payment,
      colors: {
        corner1: "bg-purple-100",
        corner2: "bg-purple-50",
        shadow: "hover:shadow-purple-100",
        hover: "group-hover:text-purple-700",
        cta: "text-purple-600",
      },
    },
    {
      title: "Ledger",
      description: "View account transactions",
      icon: <FaBook />,
      link: "/dashboard/ledger",
      style: theme.cards.ledger,
      colors: {
        corner1: "bg-orange-100",
        corner2: "bg-orange-50",
        shadow: "hover:shadow-orange-100",
        hover: "group-hover:text-orange-700",
        cta: "text-orange-600",
      },
    },
    {
      title: "Profile",
      description: "Update your personal info",
      icon: <FaUserCircle />,
      link: "/dashboard/profile",
      style: theme.cards.profile,
      colors: {
        corner1: "bg-pink-100",
        corner2: "bg-pink-50",
        shadow: "hover:shadow-pink-100",
        hover: "group-hover:text-pink-700",
        cta: "text-pink-600",
      },
    },
  ];

  return (
    <div className="w-full min-h-screen p-4 md:p-8">
      <TopBar title={"Manage your Agent Dashboard"} />

      {/* Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <Link
            to={card.link}
            key={index}
            className={`group relative overflow-hidden p-6 rounded-2xl border bg-white hover:shadow-2xl ${card.colors.shadow} border-slate-100`}
          >
            {/*  TOP RIGHT CORNER - Lighter */}
            <div
              className={`absolute top-0 right-0 w-[20%] h-[20%] ${card.colors.corner1} 
                         rounded-bl-[100%] transition-all duration-500 
                         group-hover:w-full group-hover:h-full group-hover:rounded-2xl`}
            ></div>

            {/*  BOTTOM LEFT CORNER - Even Lighter */}
            <div
              className={`absolute bottom-0 left-0 w-[20%] h-[20%] ${card.colors.corner2} 
                         rounded-tr-[100%] transition-all duration-500 
                         group-hover:w-full group-hover:h-full group-hover:rounded-2xl`}
            ></div>

            {/* CONTENT */}
            <div className="relative z-10">
              {/* Icon */}
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-5 ${card.style} group-hover:scale-110 transition`}
              >
                {card.icon}
              </div>

              {/* Text */}
              <h3
                className={`text-xl font-bold text-slate-800 mb-2 ${card.colors.hover} transition-colors`}
              >
                {card.title}
              </h3>

              <p className="text-slate-500 text-sm mb-4">{card.description}</p>

              {/* CTA */}
              <div
                className={`flex items-center ${card.colors.cta} font-semibold text-sm opacity-0 group-hover:opacity-100 -translate-x-2.5 group-hover:translate-x-0 transition-all duration-300`}
              >
                Manage Now <FaArrowRight className="ml-2 text-xs" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
