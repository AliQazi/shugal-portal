import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import axiosInstance from "../../api/axios";
import { toast } from "react-toastify";
import { generateBookingPDF } from "../../utils";
import { format } from "date-fns";
import MaskedDatePicker from "../../components/MaskedDatePicker";
import { printGDSBooking } from "../../utils/bookingPDFService";
import { Check } from "lucide-react";
import { generateClientPDF } from "../../utils/genrateclientpdf";
import TopBar from "../../components/TopBar/TopBar";

export default function MyBookings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    sector: "",
    airline: "",
    fromDate: null,
  });

  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueAirlines, setUniqueAirlines] = useState([]);
  const [timers, setTimers] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  // --- MODAL STATE ---
  const [successModalData, setSuccessModalData] = useState(null);

  // Get status from URL params
  const activeStatus = searchParams.get("status") || "";

  const statusOptions = [
    {
      value: "on hold",
      label: "On Hold",
      color: "bg-yellow-50 text-yellow-700 border border-yellow-300",
    },
    {
      value: "pending",
      label: "On Hold",
      color: "bg-yellow-50 text-yellow-700 border border-yellow-300",
    },
    {
      value: "confirmed",
      label: "Confirmed",
      color: "bg-green-50 text-green-700 border border-green-300",
    },
    {
      value: "cancelled",
      label: "Cancelled",
      color: "bg-red-50 text-red-700 border border-red-300",
    },
  ];

  useEffect(() => {
    if (location.state?.bookingSuccess) {
      setSuccessModalData({
        ref: location.state.bookingReference,
        deadline: new Date(location.state.expiresAt), // use backend expiry
      });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const calculateRemainingTime = (expiresAt) => {
    console.log("Calculating remaining time for expiryAt:", expiresAt);
    if (!expiresAt) return { hours: 0, minutes: 0, seconds: 0, expired: true };

    const diff = new Date(expiresAt) - new Date();

    if (diff <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, expired: true };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds, expired: false };
  };

  // --- UPDATED: 12-HOUR FORMAT ---
  const formatDeadline = (date) => {
    if (!date) return "";
    // Changed hour12 to true
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const dateStr = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return `${timeStr}, ${dateStr}`;
  };

  useEffect(() => {
    const onHoldBookings = bookings.filter(
      (b) => (b.status === "on hold" || b.status === "pending") && b.expiresAt,
    );

    if (onHoldBookings.length === 0) return;

    const interval = setInterval(() => {
      const newTimers = {};
      onHoldBookings.forEach((booking) => {
        newTimers[booking._id] = calculateRemainingTime(booking.expiresAt);
      });
      setTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [bookings]);

  useEffect(() => {
    fetchBookings();
  }, [filters, activeStatus, searchQuery]);

  useEffect(() => {
    // Extract unique sectors and airlines from bookings
    const sectors = [...new Set(bookings.map((b) => b.sector).filter(Boolean))];
    const airlines = [
      ...new Set(bookings.map((b) => b.airline?.name).filter(Boolean)),
    ];
    setUniqueSectors(sectors.sort());
    setUniqueAirlines(airlines.sort());
  }, [bookings]);

  const fetchBookings = async () => {
    try {
      setFetching(true);

      const params = new URLSearchParams({
        ...(searchQuery && { search: searchQuery }),
        ...(activeStatus && { status: activeStatus }),
        ...(filters.sector && { sector: filters.sector }),
        ...(filters.airline && { airline: filters.airline }),
        ...(filters.fromDate && {
          fromDate: format(filters.fromDate, "yyyy-MM-dd"),
        }),
      });

      const response = await axiosInstance.get(`/bookings?${params}`);

      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      toast.error("Failed to load bookings");
    } finally {
      setInitialLoading(false);
      setFetching(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilters({
      sector: "",
      airline: "",
      fromDate: null,
    });
    navigate("/dashboard/my-bookings");
  };

  // const getStatusBadge = (status) => {
  //     const option = statusOptions.find(opt => opt.value === status)
  //     return option || statusOptions[0]
  // }

  const getStatusBadge = (status) => {
    return (
      statusOptions.find((opt) => opt.value === status) || statusOptions[0]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (initialLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen mx-auto px-4">
      <TopBar title={" My Bookings"} />
      {/* Header */}
      {/* <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          My Bookings
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          View and manage your flight bookings
        </p>
      </div> */}

      {/* Search and Filters in One Row */}
      <div className="mb-4 bg-white rounded-lg shadow p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 min-w-50">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by reference, PNR, or contact name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sector Filter */}
          <div className="w-full sm:w-auto min-w-37.5">
            <select
              value={filters.sector}
              onChange={(e) => handleFilterChange("sector", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sectors</option>
              {uniqueSectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </div>

          {/* Airline Filter */}
          <div className="w-full sm:w-auto min-w-37.5">
            <select
              value={filters.airline}
              onChange={(e) => handleFilterChange("airline", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Airlines</option>
              {uniqueAirlines.map((airline) => (
                <option key={airline} value={airline}>
                  {airline}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="w-full sm:w-auto min-w-37.5">
            <MaskedDatePicker
              value={filters.fromDate}
              onChange={(date) => handleFilterChange("fromDate", date)}
              placeholderText="Dept Date"
              minDate={new Date()}
            />
          </div>
          {/* Reset Button */}
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-800 font-medium border border-red-300 rounded-md hover:bg-red-50 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden relative">
        {fetching && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[#3d6fa8]">
                  Booking Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[#3d6fa8]">
                  <div className="flex items-center gap-1">
                    <span>Group</span>
                    <span>✈</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[#3d6fa8]">
                  <div className="flex items-center gap-1">
                    <span>Passengers</span>
                    <span>👥</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white border-r border-[#3d6fa8]">
                  Price (PKR)
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white border-r border-[#3d6fa8]">
                  <span>Status</span>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {bookings.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-8 text-center text-gray-500 text-sm border"
                  >
                    No bookings found
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const statusBadge = getStatusBadge(booking.status);
                  const firstPassenger = booking.passengers?.[0];
                  console.log("Booking Data", booking);
                  return (
                    <tr
                      key={booking._id}
                      className="border-b border-gray-300 hover:bg-blue-50/20 transition-colors"
                    >
                      {/* Booking Details */}
                      <td className="px-4 py-4 align-middle border-r border-gray-300">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-block bg-linear-to-r from-amber-600 to-amber-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-md">
                              Airline PNR #: {booking.pnr || "N/A"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-700 leading-relaxed">
                            <span className="font-semibold text-gray-800">
                              Agency:
                            </span>{" "}
                            {booking.userId?.companyName || "N/A"}
                          </div>
                          <div className="text-xs text-gray-700 leading-relaxed">
                            <span className="font-semibold text-gray-800">
                              AGT #:
                            </span>
                            {booking.userId.agencyCode}
                            <span className="mx-2 font-semibold text-gray-800">
                              BK#:
                            </span>
                            {booking.bookingReference}
                          </div>
                          <div className="text-xs text-gray-600 pt-0.5">
                            Created: {formatDate(booking.createdAt)}
                          </div>
                        </div>
                      </td>

                      {/* Group */}
                      <td className="px-4 py-4 align-middle border-r border-gray-300">
                        <div className="space-y-1.5">
                          <div className="font-bold text-sm text-gray-900">
                            {booking.airline?.name || "Air Sial"}
                          </div>
                          <div className="text-xs text-gray-700 font-medium">
                            {booking.sector || "ISB-DXB"}
                          </div>
                          <div className="text-xs text-gray-700">
                            {formatDate(booking.departureDate)}
                          </div>
                          <div className="text-xs text-gray-600 font-medium pt-0.5">
                            {/* {booking.passengers[0].givenName} {booking.passengers[0].surName} X {booking.totalPassengers} */}
                            <div className="text-xs text-gray-600 font-medium pt-0.5">
                              {firstPassenger
                                ? `${firstPassenger.givenName} ${firstPassenger.surName}`
                                : "N/A"}{" "}
                              X {booking.totalPassengers || 0}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Passengers */}
                      <td className="px-4 py-4 align-middle border-r border-gray-300">
                        <div className="inline-block w-full">
                          <table className="w-full text-xs border border-slate-300 rounded-lg overflow-hidden">
                            <thead className="bg-[#2d5a8f] text-white">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold border-r border-slate-600">
                                  Status
                                </th>
                                <th className="px-3 py-2 text-center font-semibold border-r border-slate-600">
                                  Adults
                                </th>
                                <th className="px-3 py-2 text-center font-semibold border-r border-slate-600">
                                  Child
                                </th>
                                <th className="px-3 py-2 text-center font-semibold border-r border-slate-600">
                                  Infants
                                </th>
                                <th className="px-3 py-2 text-center font-semibold">
                                  Seats
                                </th>
                              </tr>
                            </thead>

                            <tbody className="bg-white divide-y divide-slate-200">
                              {[
                                {
                                  key: "on hold",
                                  label: "Requested",
                                  match: ["on hold", "pending", "cancelled"],
                                },
                                {
                                  key: "confirmed",
                                  label: "Confirmed",
                                  match: ["confirmed"],
                                },
                              ].map(({ key, label, match }) => {
                                const active = match.includes(booking.status);

                                const adults = active
                                  ? booking.adultsCount || 0
                                  : 0;
                                const children = active
                                  ? booking.childrenCount || 0
                                  : 0;
                                const infants = active
                                  ? booking.infantsCount || 0
                                  : 0;
                                const seats = adults + children + infants;

                                return (
                                  <tr
                                    key={key}
                                    className="hover:bg-slate-50 transition-colors"
                                  >
                                    <td className="px-3 py-2 font-medium text-slate-700 bg-slate-50 border-r border-slate-200">
                                      {label}
                                    </td>

                                    <td className="px-3 py-2 text-center font-semibold border-r border-slate-200">
                                      {adults}
                                    </td>

                                    <td className="px-3 py-2 text-center font-semibold border-r border-slate-200">
                                      {children}
                                    </td>

                                    <td className="px-3 py-2 text-center font-semibold border-r border-slate-200">
                                      {infants}
                                    </td>

                                    <td className="px-3 py-2 text-center font-bold text-slate-900">
                                      {seats}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>

                      {/* Price */}
                      <td
                        className={`px-4 py-4 ${booking.status === "on hold" || booking.status === "pending" ? "align-bottom" : "align-middle"} text-center border-r border-gray-300`}
                      >
                        <div className="font-bold text-base text-gray-900">
                          {booking.status === "on hold" ||
                          booking.status === "pending" ? (
                            <div className="text-xs text-yellow-700 font-semibold bg-yellow-50 px-2.5 py-1.5 rounded-md border border-yellow-300">
                              Admin Review
                              <br />
                              Required
                            </div>
                          ) : (
                            `PKR ${booking.pricing?.grandTotal?.toLocaleString() || "0"}`
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 align-middle text-center border-r border-gray-300">
                        <div className="space-y-2">
                          <span
                            className={`inline-block px-3 py-1.5 rounded-md text-xs shadow-sm ${statusBadge.color}`}
                          >
                            {statusBadge.label}
                          </span>
                          {(booking.status === "on hold" ||
                            booking.status === "pending") && (
                            <div className="space-y-2 pt-1">
                              <div className="text-xs">
                                <div className="font-bold text-gray-800 mb-1.5">
                                  Booking Expiry Time
                                </div>
                                <div className="flex justify-center items-center gap-1.5">
                                  {timers[booking._id] &&
                                  timers[booking._id].expired ? (
                                    <div className="text-red-600 font-bold text-xs">
                                      EXPIRED
                                    </div>
                                  ) : (
                                    <>
                                      <div className="bg-linear-to-br from-rose-500 to-rose-600 text-white px-3 py-2 rounded-lg shadow-md text-center min-w-10">
                                        <div className="text-xl font-bold leading-none">
                                          {String(
                                            timers[booking._id]?.hours || 0,
                                          ).padStart(2, "0")}
                                        </div>
                                        <div className="text-[9px] font-medium mt-1 opacity-90">
                                          HOURS
                                        </div>
                                      </div>
                                      <div className="bg-linear-to-br from-amber-500 to-amber-600 text-white px-3 py-2 rounded-lg shadow-md text-center min-w-10">
                                        <div className="text-xl font-bold leading-none">
                                          {String(
                                            timers[booking._id]?.minutes || 0,
                                          ).padStart(2, "0")}
                                        </div>
                                        <div className="text-[9px] font-medium mt-1 opacity-90">
                                          MINS
                                        </div>
                                      </div>
                                      <div className="bg-linear-to-br from-indigo-500 to-indigo-600 text-white px-3 py-2 rounded-lg shadow-md text-center min-w-10">
                                        <div className="text-xl font-bold leading-none">
                                          {String(
                                            timers[booking._id]?.seconds || 0,
                                          ).padStart(2, "0")}
                                        </div>
                                        <div className="text-[9px] font-medium mt-1 opacity-90">
                                          SECS
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-4 align-middle text-center">
                        <div className="flex flex-col items-center gap-2">
                          {/* First row: 3 buttons */}
                          <div className="flex flex-row justify-center items-center gap-2 w-full">
                            {/* View Details - Available for all bookings */}
                            <button
                              onClick={() =>
                                navigate(
                                  `/dashboard/booking-detail/${booking._id}`,
                                )
                              }
                              className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-slate-200"
                              title="View Details"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>
                            {/* Edit and Delete only for on hold/pending */}
                            {(booking.status === "on hold" ||
                              booking.status === "pending") && (
                              <>
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/dashboard/edit-booking/${booking._id}`,
                                    )
                                  }
                                  className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-slate-200"
                                  title="Edit Booking"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                                <button
                                  // onClick={() => {
                                  //     if (window.confirm('Are you sure you want to delete this booking?')) {
                                  //         // Handle delete booking
                                  //         toast.info('Delete functionality to be implemented')
                                  //     }
                                  // }}

                                  onClick={async () => {
                                    const confirmDelete = window.confirm(
                                      "Are you sure you want to delete this booking? This action cannot be undone.",
                                    );
                                    if (!confirmDelete) return;

                                    try {
                                      setDeletingId(booking._id);

                                      await axiosInstance.delete(
                                        `/bookings/${booking._id}`,
                                      );

                                      toast.success(
                                        "Booking deleted successfully",
                                      );
                                      setBookings((prev) =>
                                        prev.filter(
                                          (b) => b._id !== booking._id,
                                        ),
                                      );
                                    } catch (err) {
                                      toast.error(
                                        err.response?.data?.message ||
                                          "Failed to delete booking",
                                      );
                                    } finally {
                                      setDeletingId(null);
                                    }
                                  }}
                                  disabled={deletingId === booking._id}
                                  className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-slate-200"
                                  title="Delete Booking"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                          {/* Second row: 2 buttons (Print, Download PDF) */}
                          {(booking.status === "on hold" ||
                            booking.status === "pending" ||
                            booking.status === "confirmed") && (
                            <div className="flex flex-row justify-center items-center gap-2 w-full mt-2">
                              {/* 1. ORIGINAL FULL PDF DOWNLOAD */}
                              {/* <button
                                onClick={() => {
                                  generateBookingPDF(booking).catch((err) => {
                                    console.error("Error generating PDF:", err);
                                    toast.error("Failed to generate PDF");
                                  });
                                }}
                                className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-slate-200"
                                title="Download Full Ticket"
                              >
                                

                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              </button> */}

                              {/* 2. NEW CLIENT PDF DOWNLOAD (Only PNR & ID) */}
                              {/* <button
                                onClick={() => {
                                  generateClientPDF(booking).catch((err) => {
                                    console.error(
                                      "Error generating Client PDF:",
                                      err,
                                    );
                                    toast.error(
                                      "Failed to generate Client PDF",
                                    );
                                  });
                                }}
                                className="flex flex-col items-center justify-center p-2.5 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-red-200"
                                title="Download Client Copy (No Agency Info)"
                              >
                                
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>

                                
                                <span className="text-[9px] font-semibold mt-1 leading-none">
                                  PDF 2
                                </span>
                              </button> */}
                              {/* 3. PRINT TICKET */}
                              <button
                                onClick={() => printGDSBooking(booking)}
                                className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-slate-200 cursor-pointer"
                                title="Print Ticket"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                  />
                                </svg>
                              </button>
                            </div>
                          )}
                          {/* Cancelled bookings only have View Details (already shown above) */}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- BOOKING SUCCESS MODAL --- */}
      {successModalData && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/25 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header Background */}
            <div className="absolute top-0 left-0 w-full h-24 bg-linear-to-b from-green-50 to-white -z-10"></div>

            {/* Icon */}
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg border-4 border-green-50">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={40} className="text-green-600 stroke-3" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Booking Success
            </h2>

            <div className="text-gray-600 space-y-4 mb-8">
              <p>
                This is to inform you that your ticket reservation has been
                successfully placed{" "}
                <span className="font-bold text-gray-800">ON HOLD</span>.
              </p>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-900 leading-relaxed">
                We request you to make the payment by <br />
                <span className="font-bold text-lg block mt-1 text-[#3d6a8f]">
                  {formatDeadline(successModalData.deadline)}
                </span>
                <span className="block mt-1">
                  to guarantee your booking on the requested flight.
                </span>
              </div>
            </div>

            <button
              onClick={() => setSuccessModalData(null)}
              className="px-10 py-3 bg-[#6C63FF] hover:bg-[#5a52d5] text-white text-sm font-bold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
