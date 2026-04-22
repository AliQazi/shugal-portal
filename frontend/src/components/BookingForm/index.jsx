import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import axiosInstance from "../../api/axios";
import { toast } from "react-toastify";
import { buildPassengers } from "../../utils/passengerBuilder";
import MaskedDatePicker from "../MaskedDatePicker";
import { X, CheckCircle } from "lucide-react";
import TopBar from "../TopBar/TopBar";
import { parseMRZ } from "../../utils/parseMRZ";

export default function BookingForm({ user }) {
  // const user = JSON.parse(localStorage.getItem("frontend_user"));
  const navigate = useNavigate();
  const location = useLocation();
  const { id: bookingId } = useParams();
  const isEditMode = !!bookingId;

  const [dbMargin, setDbMargin] = useState(null);

  useEffect(() => {
    axiosInstance
      .get("/sector/getMargin")
      .then((res) => {
        if (res.data?.success) setDbMargin(res.data.data);
      })
      .catch(() => {});
  }, []);

  // 3-tier margin priority:
  // 1. Agent-specific margin (highest)
  // 2. Individual group margin (Sabaoon API only, when no agent margin set)
  // 3. Global/overall margin (fallback)
  const calculateB2BPrice = (groupPrice, group = {}) => {
    if (!user) return groupPrice; // B2C case (handled separately)
    if (user?.priceOnCall) return null;

    let finalPrice = groupPrice;

    // Priority 1: Agent-specific margin
    const marginType = user.marginType; // "Percentage" or "Amount"
    const marginPercent = user.flightMarginPercent;
    const marginAmount = user.flightMarginAmount;

    if (marginType === "Percentage" && marginPercent > 0) {
      finalPrice = groupPrice + (groupPrice * marginPercent) / 100;
    } else if (marginType === "Amount" && marginAmount > 0) {
      finalPrice = groupPrice + marginAmount;
    }

    // Priority 2: Individual group margin (only when no agent margin applied)
    if (finalPrice === groupPrice) {
      const indMargin = group?.individualMargin;
      if (indMargin !== null && indMargin !== undefined) {
        finalPrice = groupPrice + indMargin;
      }
    }

    // Priority 3: Global/overall margin (fallback)
    if (finalPrice === groupPrice && dbMargin) {
      if (dbMargin.type === "percent" && dbMargin.value > 0) {
        finalPrice = groupPrice + (groupPrice * dbMargin.value) / 100;
      } else if (dbMargin.type === "amount" && dbMargin.value > 0) {
        finalPrice = groupPrice + dbMargin.value;
      }
    }

    return Math.round(finalPrice);
  };

  const [formData, setFormData] = useState({
    contactPersonName: "N/A",
    adults: 1,
    children: 0,
    infants: 0,
    passengers: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingBooking, setLoadingBooking] = useState(isEditMode);
  // const [existingBooking, setExistingBooking] = useState(null);
  const [groupData, setGroupData] = useState(location.state?.groupData || null);
  // const [totalSeats, setTotalSeats] = useState(null);

  const [mrzModal, setMrzModal] = useState({ open: false, index: null });
  const [mrzInput, setMrzInput] = useState("");
  const [mrzError, setMrzError] = useState("");
  // pendingDocs: { [passengerIndex]: File } — held locally until booking is submitted
  const [pendingDocs, setPendingDocs] = useState({});

  // --- NEW STATE FOR MODAL ---
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isReviewed, setIsReviewed] = useState(false);

  // Load existing booking if in edit mode
  useEffect(() => {
    if (isEditMode && bookingId) {
      fetchBookingForEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, isEditMode]);

  const fetchBookingForEdit = async () => {
    try {
      setLoadingBooking(true);
      const response = await axiosInstance.get(`/bookings/${bookingId}`);

      if (response.data.success) {
        const booking = response.data.data;

        if (booking.status !== "on hold") {
          toast.error("Can only edit pending bookings");
          navigate("/dashboard/my-bookings");
          return;
        }

        // setExistingBooking(booking);

        // Fetch the actual group to get real available seats
        let availableSeats = 0;
        const isLocalGroup = /^[0-9a-fA-F]{24}$/.test(booking.groupId);
        if (isLocalGroup) {
          try {
            const groupRes = await axiosInstance.get(`/group-ticketing/${booking.groupId}`);
            if (groupRes.data.success) {
              availableSeats = groupRes.data.data.totalSeats ?? 0;
            }
          } catch {
            // non-fatal — leave as 0
          }
        }

        const reconstructedGroupData = {
          id: booking.groupId,
          type: booking.groupType,
          airline: {
            id: booking.airline?.id || null,
            airline_name: booking.airline?.name || "",
            logo_url: booking.airline?.logoUrl || "",
          },
          sector: booking.sector,
          pnr: booking.pnr,
          price: booking.pricing?.adultPrice || 0,
          childPrice: booking.pricing?.childPrice || 0,
          infantPrice: booking.pricing?.infantPrice || 0,
          dept_date: booking.departureDate,
          arv_date: booking.arrivalDate,
          details:
            booking.flights?.map((flight) => ({
              flight_no: flight.flightNo,
              flight_date: flight.flightDate,
              dep_date: flight.depDate,
              dept_time: flight.depTime,
              origin: flight.origin,
              destination: flight.destination,
              arv_date: flight.arrDate,
              arv_time: flight.arrTime,
              baggage: flight.baggage,
              meal: flight.meal,
            })) || [],
          available_no_of_pax: availableSeats,
        };

        setGroupData(reconstructedGroupData);

        const formattedPassengers =
          booking.passengers?.map((passenger) => ({
            ...passenger,
            dateOfBirth: passenger.dateOfBirth
              ? new Date(passenger.dateOfBirth)
              : "",
            passportExpiry: passenger.passportExpiry
              ? new Date(passenger.passportExpiry)
              : "",
            passportIssue: passenger.passportIssue
              ? new Date(passenger.passportIssue)
              : "",
            documentUrl: passenger.documentUrl || "",
          })) || [];

        setFormData({
          contactPersonName: booking.contactPersonName || "N/A",
          adults: booking.adultsCount,
          children: booking.childrenCount,
          infants: booking.infantsCount,
          passengers: formattedPassengers,
        });
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
      toast.error("Failed to load booking");
      navigate("/dashboard/my-bookings");
    } finally {
      setLoadingBooking(false);
    }
  };

  const totalPassengers =
    (parseInt(formData.adults) || 0) +
    (parseInt(formData.children) || 0) +
    (parseInt(formData.infants) || 0);

  const isChildPriceAvailable = () => {
    const price = groupData?.childPrice;
    return price !== null && price !== undefined && price !== 0;
  };

  const isInfantPriceAvailable = () => {
    const price = groupData?.infantPrice;
    return price !== null && price !== undefined && price !== 0;
  };

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      passengers: buildPassengers({
        adults: +prev.adults || 0,
        children: +prev.children || 0,
        infants: +prev.infants || 0,
        existing: prev.passengers,
        allowChildren: true,
        allowInfants: true,
      }),
    }));
  }, [formData.adults, formData.children, formData.infants, isEditMode]);

  // --- Helper to safely render dates ---
  const formatDateForDisplay = (dateValue) => {
    if (!dateValue) return "";
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString("en-GB"); // DD/MM/YYYY
    }
    const parsedDate = new Date(dateValue);
    if (!isNaN(parsedDate)) {
      return parsedDate.toLocaleDateString("en-GB");
    }
    return dateValue;
  };

  const validatePassengerInput = (name, value) => {
    if (value === "") return true;
    const numValue = parseInt(value);
    if (numValue < 0) return false;
    if (name === "adults" && numValue === 0) return false;
    return true;
  };

  const getDefaultPassengerValue = (name) => {
    return name === "adults" ? 1 : 0;
  };

  const validateSeatLimit = (adults, children) => {
    if (isEditMode) return true;
    const totalSeats = adults + children;
    const availableSeats = groupData?.available_no_of_pax || 0;
    return totalSeats <= availableSeats;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["adults", "children", "infants"].includes(name)) {
      if (!validatePassengerInput(name, value)) {
        return;
      }
    }
    // setFormData(prev => ({ ...prev, [name]: value }))
    const updated = {
      ...formData,
      [name]: value,
    };

    const totalSeatsRequired =
      parseInt(updated.adults || 0) +
      parseInt(updated.children || 0) +
      parseInt(updated.infants || 0);

    const availableSeats = groupData?.available_no_of_pax || 0;

    if (totalSeatsRequired > availableSeats) {
      toast.error("No seats available. You cannot exceed available seats.");
      return;
    }

    setFormData(updated);
    // setTotalSeats(totalSeatsRequired);
  };
  const handlePassengerBlur = (e) => {
    const { name, value } = e.target;
    if (!["adults", "children", "infants"].includes(name)) return;

    if (
      value === "" ||
      parseInt(value) < 0 ||
      (name === "adults" && parseInt(value) === 0)
    ) {
      const defaultValue = getDefaultPassengerValue(name);
      setFormData((prev) => ({ ...prev, [name]: defaultValue }));
      return;
    }

    if (!isEditMode && (name === "adults" || name === "children")) {
      const adults =
        name === "adults" ? parseInt(value) : parseInt(formData.adults) || 0;
      const children =
        name === "children"
          ? parseInt(value)
          : parseInt(formData.children) || 0;

      if (!validateSeatLimit(adults, children)) {
        const totalSeats = adults + children;
        const availableSeats = groupData?.available_no_of_pax || 0;
        toast.error(
          `Seats not available! You selected ${totalSeats} seats but only ${availableSeats} are available.`,
          { toastId: "seat-limit-error" },
        );
        const defaultValue = getDefaultPassengerValue(name);
        setFormData((prev) => ({ ...prev, [name]: defaultValue }));
        e.target.focus();
      }
    }
  };

  const handlePassengerChange = (index, field, value) => {
    setFormData((prev) => {
      const newPassengers = [...prev.passengers];
      newPassengers[index] = { ...newPassengers[index], [field]: value };
      return { ...prev, passengers: newPassengers };
    });
  };

  // Store a file locally for a passenger — actual upload happens at booking submit
  const handleDocSelect = (index, file) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP, or PDF files are allowed");
      return;
    }
    setPendingDocs((prev) => ({ ...prev, [index]: file }));
    // Clear any previously stored URL so the pending file takes precedence
    handlePassengerChange(index, "documentUrl", "");
  };

  // Remove a pending or already-uploaded document for a passenger
  const handleDocRemove = (index) => {
    setPendingDocs((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    handlePassengerChange(index, "documentUrl", "");
  };

  // Upload all pending docs; returns an updated passengers array with real URLs filled in
  const uploadPendingDocs = async (passengers) => {
    const updated = passengers.map((p) => ({ ...p }));
    const entries = Object.entries(pendingDocs);
    if (entries.length === 0) return updated;

    await Promise.all(
      entries.map(async ([idxStr, file]) => {
        const idx = parseInt(idxStr, 10);
        if (idx >= updated.length) return;
        const fd = new FormData();
        fd.append("document", file);
        try {
          const res = await axiosInstance.post("/bookings/upload-document", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (res.data.success) {
            updated[idx].documentUrl = res.data.url;
          }
        } catch (err) {
          console.error(`Doc upload failed for passenger ${idx}:`, err);
          // Non-fatal — booking proceeds without doc for this passenger
        }
      }),
    );
    return updated;
  };

  const handleMrzScan = (index) => {
    setMrzModal({ open: true, index });
    setMrzInput("");
    setMrzError("");
  };

  const handleMrzParse = () => {
    // Parse multiple MRZ blocks: try blank-line separation first, then consecutive pairs
    const rawBlocks = mrzInput.trim().split(/\n[ \t]*\n/);
    let results = [];
    if (rawBlocks.length > 1) {
      results = rawBlocks.map((block) => parseMRZ(block.trim())).filter(Boolean);
    } else {
      const lines = mrzInput.trim().split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      for (let i = 0; i + 1 < lines.length; i += 2) {
        const result = parseMRZ(lines[i] + "\n" + lines[i + 1]);
        if (result) results.push(result);
      }
    }

    if (results.length === 0) {
      setMrzError(
        "Invalid MRZ code. Please paste the complete 2-line MRZ from the passport.",
      );
      return;
    }

    const startIdx = mrzModal.index;
    setFormData((prev) => {
      const newPassengers = [...prev.passengers];
      results.forEach((result, offset) => {
        const idx = startIdx + offset;
        if (idx >= newPassengers.length) return;
        newPassengers[idx] = {
          ...newPassengers[idx],
          surName: result.surName || newPassengers[idx].surName,
          givenName: result.givenName || newPassengers[idx].givenName,
          passport: result.passport || newPassengers[idx].passport,
          nationality: result.nationality || newPassengers[idx].nationality,
          dateOfBirth: result.dateOfBirth || newPassengers[idx].dateOfBirth,
          passportExpiry: result.passportExpiry || newPassengers[idx].passportExpiry,
          title: result.title || newPassengers[idx].title,
        };
      });
      return { ...prev, passengers: newPassengers };
    });

    const filled = Math.min(results.length, formData.passengers.length - startIdx);
    toast.success(`${filled} passport${filled > 1 ? "s" : ""} scanned successfully!`);
    setMrzModal({ open: false, index: null });
    setMrzInput("");
  };

  const calculateAdultTotal = () =>
    (parseInt(formData.adults) || 0) *
    (calculateB2BPrice(groupData?.price, groupData) || 0);

  const calculateChildTotal = () =>
    (parseInt(formData.children) || 0) *
    (calculateB2BPrice(groupData?.childPrice, groupData) || 0);

  const calculateInfantTotal = () =>
    (parseInt(formData.infants) || 0) *
    (calculateB2BPrice(groupData?.infantPrice, groupData) || 0);

  const calculateTotalPrice = () =>
    calculateAdultTotal() + calculateChildTotal() + calculateInfantTotal();

  // --- MODIFIED: Initial Submit Trigger (Opens Modal) ---
  const handleSubmit = (e) => {
    e.preventDefault();

    if (isEditMode) {
      return handleUpdate();
    }

    const payingPassengers =
      (parseInt(formData.adults) || 0) +
      (parseInt(formData.children) || 0) +
      (parseInt(formData.infants) || 0);
    if (payingPassengers > (groupData?.available_no_of_pax || 0)) {
      toast.error(
        `Total passengers (${payingPassengers}) cannot exceed available seats (${groupData?.available_no_of_pax || 0})`,
      );
      return;
    }

    const hasEmptyFields = formData.passengers.some(
      (passenger) =>
        !passenger.givenName ||
        !passenger.surName ||
        !passenger.passport ||
        !passenger.nationality,
    );

    if (hasEmptyFields) {
      toast.error("Please fill in all passenger details");
      return;
    }

    // --- Show Modal instead of submitting ---
    setShowReviewModal(true);
    setIsReviewed(false);
  };

  // --- NEW: Final Submit Logic (Called from Modal) ---
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setShowReviewModal(false); // Close modal

    try {
      // Upload any locally-held documents before creating the booking
      const passengersWithDocs = await uploadPendingDocs(formData.passengers);

      const bookingData = {
        groupId: groupData.id,
        source: groupData.source || "admin",
        groupType: groupData.type,
        airline: {
          id: groupData.airline?.id || null,
          name: groupData.airline?.airline_name || "",
          logoUrl: groupData.airline?.logo_url || "",
        },
        sector: groupData.sector,
        pnr: groupData.pnr || "",
        contactPersonName: "N/A",
        adultsCount: parseInt(formData.adults),
        childrenCount: parseInt(formData.children),
        infantsCount: parseInt(formData.infants),
        totalPassengers: totalPassengers,
        pricing: {
          // Final prices including margin (stored in DB, shown to agent)
          adultPrice: calculateB2BPrice(groupData.price, groupData) || 0,
          childPrice: calculateB2BPrice(groupData.childPrice, groupData) || 0,
          infantPrice: calculateB2BPrice(groupData.infantPrice, groupData) || 0,
          // Original base prices (sent to Sabaoon API, used for margin breakdown)
          adultBasePrice: groupData.price || 0,
          childBasePrice: groupData.childPrice || 0,
          infantBasePrice: groupData.infantPrice || 0,
          adultTotal: calculateAdultTotal(),
          childTotal: calculateChildTotal(),
          infantTotal: Math.round(calculateInfantTotal()),
          grandTotal: Math.round(calculateTotalPrice()),
        },
        passengers: passengersWithDocs,
        flights:
          groupData.details?.map((flight) => ({
            flightNo: flight.flight_no,
            flightDate: flight.flight_date,
            depDate: flight.dep_date,
            depTime: flight.dept_time,
            origin: flight.origin,
            destination: flight.destination,
            arrDate: flight.arv_date,
            arrTime: flight.arv_time,
            baggage: flight.baggage,
            meal: flight.meal,
          })) || [],
        departureDate: groupData.dept_date,
        arrivalDate: groupData.arv_date,
      };

      const response = await axiosInstance.post("/bookings", bookingData);

      if (response.data.success) {
        navigate("/dashboard/my-bookings", {
          state: {
            bookingSuccess: true,
            bookingReference: response.data.data.bookingReference,
            expiresAt: response.data.data.expiresAt,
          },
        });
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to create booking. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    setIsSubmitting(true);

    try {
      // Upload any locally-held documents before updating the booking
      const passengersWithDocs = await uploadPendingDocs(formData.passengers);

      const updateData = {
        contactPersonName: formData.contactPersonName,
        adultsCount: parseInt(formData.adults),
        childrenCount: parseInt(formData.children),
        infantsCount: parseInt(formData.infants),
        passengers: passengersWithDocs,
        pricing: {
          // Final prices including margin
          adultPrice: calculateB2BPrice(groupData?.price, groupData) || 0,
          childPrice: calculateB2BPrice(groupData?.childPrice, groupData) || 0,
          infantPrice: calculateB2BPrice(groupData?.infantPrice, groupData) || 0,
          // Original base prices
          adultBasePrice: groupData?.price || 0,
          childBasePrice: groupData?.childPrice || 0,
          infantBasePrice: groupData?.infantPrice || 0,
          adultTotal: calculateAdultTotal(),
          childTotal: calculateChildTotal(),
          infantTotal: Math.round(calculateInfantTotal()),
          grandTotal: Math.round(calculateTotalPrice()),
        },
      };

      const response = await axiosInstance.put(
        `/bookings/${bookingId}`,
        updateData,
      );

      if (response.data.success) {
        toast.success("Booking updated successfully");
        setTimeout(() => {
          navigate("/dashboard/my-bookings");
        }, 1000);
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to update booking";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!groupData && !isEditMode) {
    return (
      <div className="w-full min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">No flight data available</p>
          <button
            onClick={() => navigate("/dashboard/all-groups")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Flights
          </button>
        </div>
      </div>
    );
  }

  if (loadingBooking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen mx-auto flex flex-col gap-2">
      <TopBar title={isEditMode ? "Edit Booking" : "Add New Booking"} />
      <div className="mb-4 sm:mb-6 md:mb-8">
        {/* <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2"></h1> */}
      </div>
      <div className="bg-white border border-gray-300 shadow-sm rounded-2xl">
        {groupData && (
          <div className="px-4 py-2 flex flex-col lg:flex-row justify-between gap-3 items-start lg:items-center border-b border-gray-200 text-xs">
            {/* Airline Logo */}
            <>
              {groupData.airline?.logo_url && (
                <img
                  src={groupData.airline.logo_url}
                  alt={groupData.airline.airline_name}
                  className="w-16 sm:w-20 h-auto"
                />
              )}
            </>

            {/* Sector Information */}
            <div className="flex flex-col">
              <p className="text-xs text-gray-600 font-semibold mb-0.5">
                Sector Information
              </p>
              {groupData.details && groupData.details.length > 0 && (
                <div className="text-xs font-bold text-gray-900">
                  {groupData.details.map((flight, idx) => (
                    <div key={idx}>
                      {flight.flight_no}{" "}
                      {new Date(flight.flight_date).toLocaleDateString(
                        "en-GB",
                        { day: "2-digit", month: "short" },
                      )}{" "}
                      {flight.origin}-{flight.destination}{" "}
                      {flight.dept_time?.substring(0, 5)}{" "}
                      {flight.arv_time?.substring(0, 5)}{" "}
                      {flight.baggage || "20+07-KG"} Baggage
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dep Date */}
            <div className="flex flex-col text-center">
              <p className="text-xs text-gray-600 font-semibold mb-0.5">
                Dep Date
              </p>
              <p className="text-xs font-bold text-gray-900">
                {new Date(groupData.dept_date).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Meal */}
            <div className="flex flex-col text-center">
              <p className="text-xs text-gray-600 font-semibold mb-0.5">Meal</p>
              <p className="text-xs font-bold text-gray-900">Yes</p>
            </div>

            {/* Pricing Info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 lg:gap-32 w-full lg:w-auto">
              <div className="flex flex-row gap-4 sm:gap-8 lg:gap-32 w-full sm:w-auto flex-wrap">
                <div className="flex flex-col">
                  <p className="text-xs text-gray-600 font-semibold mb-0.5">
                    Available Seats
                  </p>
                  <p className="text-sm font-extrabold text-[#3d6a8f] bg-blue-50 px-2 py-1 rounded-2xl">
                    {" "}
                    {groupData?.available_no_of_pax?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="text-xs text-gray-600 font-semibold mb-0.5">
                    Adult Price
                  </p>
                  <p
                    className={`${user?.priceOnCall ? "text-white bg-red-600" : "text-[#3d6a8f] bg-blue-50"} text-sm font-extrabold px-2 py-1 rounded-2xl whitespace-nowrap`}
                  >
                    {user?.priceOnCall
                      ? "Price on Call"
                      : `PKR ${calculateB2BPrice(groupData.price, groupData)?.toLocaleString()}`}
                    {/* 
                                      {groupData?.price?.toLocaleString() || 0} */}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="text-xs text-gray-600 font-semibold mt-1 mb-0.5">
                    Child
                  </p>
                  <p className="text-sm font-extrabold text-[#3d6a8f] bg-blue-50 px-2 py-1 rounded-2xl">
                    {calculateB2BPrice(groupData?.childPrice, groupData)?.toLocaleString() || "N/A"}
                  </p>
                </div>

                <div className="flex flex-col">
                  <p className="text-xs text-gray-600 font-semibold mt-1 mb-0.5">
                    Infant
                  </p>
                  <p
                    className={`text-sm font-extrabold px-2 py-1 rounded-2xl whitespace-nowrap ${isInfantPriceAvailable() ? "text-[#3d6a8f] bg-blue-50" : "text-white bg-red-600"}`}
                  >{`${isInfantPriceAvailable() ? `PKR ${calculateB2BPrice(groupData.infantPrice, groupData)?.toLocaleString()}` : "Price On Call"}`}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Passengers and Pricing Table */}
        <div className="bg-white border border-gray-300 shadow-sm overflow-x-auto">
          <div className="min-w-150">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#3d6a8f] text-white">
                  <th className="px-3 py-2 text-left text-xs font-bold border-r border-white/20 w-2/6">
                    Passengers
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold border-r border-white/20 w-2/6">
                    Price
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold border-r border-white/20 w-1/6">
                    Seats
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-bold w-1/6">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Adult Row */}
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-1/4 font-medium text-gray-900">
                        Adult
                      </span>
                      <div className="w-3/4">
                        <input
                          type="number"
                          name="adults"
                          value={formData.adults}
                          onChange={handleChange}
                          onBlur={handlePassengerBlur}
                          min="1"
                          className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-center text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-gray-900 border-r border-gray-200">
                    {/* PKR {groupData?.price?.toLocaleString() || 0} */}
                    <span
                      className={`${user?.priceOnCall ? "text-red-500" : "text-[#3d6a8f]"} inline-block text-xs font-extrabold px-2 py-1 rounded-2xl`}
                    >
                      {user?.priceOnCall
                        ? "Price on Call"
                        : `PKR ${calculateB2BPrice(groupData?.price, groupData)?.toLocaleString()}`}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs font-bold text-gray-900 border-r border-gray-200">
                    {formData.adults}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-bold text-gray-900">
                    {user?.priceOnCall ? (
                      <span className="text-red-500 font-semibold">
                        Price on Call
                      </span>
                    ) : (
                      `PKR ${calculateAdultTotal().toLocaleString()}`
                    )}
                  </td>
                </tr>

                {/* Children Row */}
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-1/4 font-medium text-gray-900">
                        Children
                      </span>
                      <div className="w-3/4">
                        <input
                          type="number"
                          name="children"
                          value={formData.children}
                          onChange={handleChange}
                          onBlur={handlePassengerBlur}
                          min="0"
                          className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-center text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs font-medium border-r border-gray-200">
                    {isChildPriceAvailable() ? (
                      <span className="text-[#3d6a8f] inline-block text-xs font-extrabold px-2 py-1 rounded-2xl">
                        PKR{" "}
                        {calculateB2BPrice(
                          groupData?.childPrice,
                          groupData,
                        )?.toLocaleString() || 0}
                      </span>
                    ) : (
                      <span className="text-gray-500 font-semibold">N/A</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center text-xs font-bold text-gray-900 border-r border-gray-200">
                    {formData.children}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-bold text-gray-900">
                    {isChildPriceAvailable()
                      ? `PKR ${calculateChildTotal().toLocaleString()}`
                      : "-"}
                  </td>
                </tr>

                {/* Infants Row */}
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-1/4 font-medium text-gray-900">
                        Infants
                      </span>
                      <div className="w-3/4">
                        <input
                          type="number"
                          name="infants"
                          value={formData.infants}
                          onChange={handleChange}
                          onBlur={handlePassengerBlur}
                          min="0"
                          className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-center text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs font-medium border-r border-gray-200">
                    {isInfantPriceAvailable() ? (
                      <span className="text-gray-900">
                        PKR{" "}
                        {calculateB2BPrice(
                          groupData?.infantPrice,
                          groupData,
                        )?.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-red-500 font-semibold">
                        Price On Call
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center text-xs font-bold text-gray-900 border-r border-gray-200">
                    {formData.infants}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-bold text-gray-900">
                    {isInfantPriceAvailable()
                      ? `PKR ${Math.round(calculateInfantTotal()).toLocaleString()}`
                      : "-"}
                  </td>
                </tr>

                {/* Total Row */}
                <tr className="bg-gray-100">
                  <td
                    colSpan="2"
                    className="px-3 py-2 text-xs font-bold text-gray-900"
                  >
                    Total
                  </td>
                  <td className="px-3 py-2 text-center text-xs font-bold text-gray-900 border-r border-gray-200">
                    {totalPassengers}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-bold">
                    {user?.priceOnCall ? (
                      <span className="text-red-500 font-semibold">
                        Price on Call
                      </span>
                    ) : (
                      `PKR ${Math.round(calculateTotalPrice()).toLocaleString()}`
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Passenger Details Table */}
        <div className="bg-white border border-gray-300 shadow-sm overflow-x-auto">
          <div className="min-w-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#3d6a8f] text-white">
                  <th className="px-3 py-2 text-left text-xs font-bold border-r border-white/20">
                    SR#
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold border-r border-white/20">
                    Title
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold border-r border-white/20">
                    Surname
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold border-r border-white/20">
                    Given Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold border-r border-white/20">
                    Passport No
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold border-r border-white/20">
                    Date Of Birth
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold border-r border-white/20">
                    Passport Expiry
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold border-r border-white/20">
                    Nationality
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold">
                    Document
                  </th>
                </tr>
              </thead>
              <tbody>
                {formData.passengers.map((passenger, index) => {
                  let passengerLabel = "";
                  if (passenger.type === "Adult") {
                    const adultNum = formData.passengers
                      .slice(0, index + 1)
                      .filter((p) => p.type === "Adult").length;
                    passengerLabel = `Adult ${adultNum}`;
                  } else if (passenger.type === "Child") {
                    const childNum = formData.passengers
                      .slice(0, index + 1)
                      .filter((p) => p.type === "Child").length;
                    passengerLabel = `Child ${childNum}`;
                  } else if (passenger.type === "Infant") {
                    const infantNum = formData.passengers
                      .slice(0, index + 1)
                      .filter((p) => p.type === "Infant").length;
                    passengerLabel = `Infant ${infantNum}`;
                  }

                  return (
                    <tr
                      key={index}
                      className="border-b border-gray-200 bg-gray-50 hover:bg-gray-100"
                    >
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {passengerLabel}
                          <button
                            type="button"
                            onClick={() => handleMrzScan(index)}
                            title="Scan Passport MRZ"
                            className="flex items-center gap-1 px-2 py-0.5 bg-[#3d6a8f]/10 hover:bg-[#3d6a8f] text-[#3d6a8f] hover:text-white border border-[#3d6a8f]/30 rounded text-[10px] font-bold transition-all duration-200 group"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="2" y="4" width="20" height="16" rx="2" />
                              <line x1="2" y1="14" x2="22" y2="14" />
                              <line x1="6" y1="18" x2="6.01" y2="18" />
                              <line x1="10" y1="18" x2="14" y2="18" />
                            </svg>
                            Scan
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={passenger.title}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "title",
                              e.target.value,
                            )
                          }
                          required
                          className="w-full min-w-22.5  px-2 py-1 bg-white border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        >
                          {passenger.type === "Adult" && (
                            <>
                              <option value="Mr">Mr</option>
                              <option value="Ms">Ms</option>
                              <option value="Mrs">Mrs</option>
                            </>
                          )}
                          {passenger.type === "Child" && (
                            <option value="CHLD">CHLD</option>
                          )}
                          {passenger.type === "Infant" && (
                            <option value="INF">INF</option>
                          )}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={passenger.surName}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "surName",
                              e.target.value,
                            )
                          }
                          required
                          className="w-full min-w-30 px-2 py-1  bg-white border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Surname"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={passenger.givenName}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "givenName",
                              e.target.value,
                            )
                          }
                          required
                          className="w-full min-w-30  px-2 py-1 bg-white border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Given Name"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={passenger.passport}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "passport",
                              e.target.value,
                            )
                          }
                          required
                          className="w-full min-w-30 px-2 py-1 bg-white border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Passport No"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="min-w-32.5">
                          <MaskedDatePicker
                            value={passenger.dateOfBirth}
                            onChange={(date) =>
                              handlePassengerChange(index, "dateOfBirth", date)
                            }
                            size="small"
                            maxDate={new Date()}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="min-w-32.5">
                          <MaskedDatePicker
                            value={passenger.passportExpiry}
                            onChange={(date) =>
                              handlePassengerChange(
                                index,
                                "passportExpiry",
                                date,
                              )
                            }
                            size="small"
                            minDate={new Date()}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <input
                          type="text"
                          value={passenger.nationality || ""}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "nationality",
                              e.target.value,
                            )
                          }
                          className="w-full min-w-30  px-2 py-1 bg-white border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nationality"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1 min-w-28">
                          {/* Show preview: pending local file takes priority over stored URL */}
                          {(pendingDocs[index] || passenger.documentUrl) ? (
                            <div className="flex items-center gap-1.5">
                              {pendingDocs[index] ? (
                                // Local file preview (not yet uploaded)
                                pendingDocs[index].type === "application/pdf" ? (
                                  <span className="text-[10px] text-amber-600 font-semibold border border-amber-300 bg-amber-50 px-1.5 py-0.5 rounded">
                                    PDF ready
                                  </span>
                                ) : (
                                  <img
                                    src={URL.createObjectURL(pendingDocs[index])}
                                    alt="doc preview"
                                    className="h-8 w-12 object-cover rounded border border-amber-300"
                                    title="Pending — will upload on submit"
                                  />
                                )
                              ) : passenger.documentUrl.match(/\.(jpg|jpeg|png|webp)/i) ? (
                                <a href={passenger.documentUrl} target="_blank" rel="noreferrer">
                                  <img
                                    src={passenger.documentUrl}
                                    alt="doc"
                                    className="h-8 w-12 object-cover rounded border border-gray-300"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={passenger.documentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-blue-600 underline truncate max-w-20"
                                >
                                  PDF
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDocRemove(index)}
                                className="text-red-400 hover:text-red-600"
                                title="Remove"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : null}
                          <label className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer border transition-all duration-200 bg-[#3d6a8f]/10 hover:bg-[#3d6a8f] text-[#3d6a8f] hover:text-white border-[#3d6a8f]/30">
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            {(pendingDocs[index] || passenger.documentUrl) ? "Replace" : "Upload"}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              className="hidden"
                              onChange={(e) => handleDocSelect(index, e.target.files?.[0])}
                            />
                          </label>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 px-4 py-3 bg-white border-t border-gray-200 justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full sm:w-auto px-8 py-2 rounded text-sm font-bold shadow transform transition-all duration-300 ${isSubmitting ? "bg-gray-400 text-white cursor-not-allowed" : "bg-[#3d6a8f] text-white hover:bg-[#2d5a8f] hover:scale-105 hover:shadow-lg active:scale-95"}`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2 justify-center">
                <svg
                  className="animate-spin w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : isEditMode ? (
              "Update Booking"
            ) : (
              "Confirm Booking"
            )}
          </button>
        </div>
      </form>

      {/* --- MRZ SCAN MODAL --- */}
      {mrzModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="bg-[#3d6a8f] px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="2" y1="14" x2="22" y2="14" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                    <line x1="10" y1="18" x2="14" y2="18" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-bold text-base">
                    Passport MRZ Scanner
                  </h4>
                  <p className="text-white/70 text-xs">
                    Passenger{" "}
                    {mrzModal.index !== null
                      ? formData.passengers[mrzModal.index]?.type
                      : ""}{" "}
                    {(mrzModal.index || 0) + 1}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMrzModal({ open: false, index: null })}
                className="text-white/70 hover:text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
                <div className="text-blue-500 mt-0.5 shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="text-xs text-blue-700 leading-relaxed">
                  💡 The MRZ is the two lines of machine-readable text at the bottom of the main passport page. To fill multiple passengers at once, paste each passport's MRZ one after the other (separated by a blank line or just consecutively).
                </div>
              </div>

              {/* Textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Paste the MRZ code
                </label>
                <textarea
                  autoFocus
                  value={mrzInput}
                  onChange={(e) => {
                    setMrzInput(e.target.value);
                    setMrzError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === "Enter") handleMrzParse();
                  }}
                  placeholder={`P<PAKNAME<<GIVEN<NAME<<<<<<<<<<<<<<<<<<<<<\nAB1234567PAK8501011M2601014<<<<<<<<<<<<<<<6\n\nP<PAKSECOND<<PASSENGER<<<<<<<<<<<<<<<<<<<<\nCD9876543PAK9001011F2801014<<<<<<<<<<<<<<8`}
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#3d6a8f]/30 focus:border-[#3d6a8f] resize-none bg-gray-50 placeholder-gray-300 leading-6"
                />
                {mrzError && (
                  <p className="text-red-500 text-xs flex items-center gap-1.5 mt-0.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {mrzError}
                  </p>
                )}
              </div>

              {/* Sample */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Example MRZ Format
                </p>
                <code className="text-[10px] font-mono text-gray-500 leading-5 block break-all">
                  P&lt;PAKSMITH&lt;&lt;JOHN&lt;WILLIAM&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                  <br />
                  AB1234567PAK8501011M2601014&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;6
                </code>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMrzModal({ open: false, index: null })}
                className="px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMrzParse}
                disabled={!mrzInput.trim()}
                className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${mrzInput.trim()
                  ? "bg-[#3d6a8f] text-white hover:bg-[#2d5a8f] shadow-sm hover:shadow-md"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
              >
                Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REFACTORED REVIEW MODAL --- */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 sm:px-6 py-4 flex justify-between items-center gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* <div className="bg-[#3d6a8f]/10 p-2 rounded-full">
                                    <UserCheck size={24} className="text-[#3d6a8f]" />
                                </div> */}
                <div>
                  <h4 className="text-base sm:text-xl font-semibold! text-gray-900">
                    Please review passenger booking data before submission
                  </h4>
                  {/* <p className="text-xs text-gray-500">Please verify all passenger information before final submission.</p> */}
                </div>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors shrink-0"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="overflow-y-auto p-4 sm:p-6 flex-1">
              <div className="rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
                <div className="min-w-200">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-[#3d6a8f] text-white">
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-r border-white/20">
                          SR #
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-r border-white/20">
                          Title
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-r border-white/20">
                          Surname
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-r border-white/20">
                          Given Name
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-r border-white/20">
                          Passport
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-r border-white/20">
                          DOB
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-r border-white/20">
                          Passport Expiry
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-r border-white/20">
                          Nationality
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                          Document
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {formData.passengers.map((p, i) => (
                        <tr
                          key={i}
                          className="hover:bg-blue-50/30 transition-colors"
                        >
                          <td className="px-4 py-3 border-r border-gray-100">
                            {`${p.type} ${p.type === "Adult" ? i + 1 : ""}`}
                          </td>
                          <td className="px-4 py-3 border-r border-gray-100">
                            {p.title}
                          </td>
                          <td className="px-4 py-3 border-r border-gray-100 font-bold">
                            {p.surName}
                          </td>
                          <td className="px-4 py-3 border-r border-gray-100 font-bold">
                            {p.givenName}
                          </td>
                          <td className="px-4 py-3 border-r border-gray-100 tracking-wide">
                            {p.passport}
                          </td>
                          <td className="px-4 py-3 border-r border-gray-100">
                            {formatDateForDisplay(p.dateOfBirth)}
                          </td>
                          <td className="px-4 py-3 border-r border-gray-100">
                            {formatDateForDisplay(p.passportExpiry)}
                          </td>
                          <td className="px-4 py-3 border-r border-gray-100">{p.nationality}</td>
                          <td className="px-4 py-3">
                            {pendingDocs[i] ? (
                              pendingDocs[i].type === "application/pdf" ? (
                                <span className="text-xs text-amber-600 font-semibold border border-amber-300 bg-amber-50 px-2 py-0.5 rounded">
                                  PDF — pending upload
                                </span>
                              ) : (
                                <img
                                  src={URL.createObjectURL(pendingDocs[i])}
                                  alt="doc"
                                  className="h-8 w-12 object-cover rounded border border-amber-300"
                                  title="Will be uploaded on submit"
                                />
                              )
                            ) : p.documentUrl ? (
                              p.documentUrl.match(/\.(jpg|jpeg|png|webp)/i) ? (
                                <a href={p.documentUrl} target="_blank" rel="noreferrer">
                                  <img
                                    src={p.documentUrl}
                                    alt="doc"
                                    className="h-8 w-12 object-cover rounded border border-gray-300"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={p.documentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-600 underline"
                                >
                                  PDF
                                </a>
                              )
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-4 sm:px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Confirmation Checkbox */}
              <label className="flex items-start sm:items-center gap-3 cursor-pointer group bg-white border border-gray-200 px-4 py-3 rounded-lg hover:border-[#3d6a8f] transition-all shadow-sm w-full sm:w-auto">
                <div className="relative flex items-center shrink-0 mt-0.5 sm:mt-0">
                  <input
                    type="checkbox"
                    checked={isReviewed}
                    onChange={(e) => setIsReviewed(e.target.checked)}
                    className="peer w-5 h-5 cursor-pointer appearance-none rounded border-2 border-gray-400 checked:border-[#3d6a8f] checked:bg-[#3d6a8f] transition-all"
                  />
                  <CheckCircle
                    size={14}
                    className="absolute left-0.5 top-0.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
                  />
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-700 group-hover:text-gray-900 select-none">
                  {/* I confirm that all data is accurate. */}I hereby confirm
                  that all the information I have provided in this form is
                  accurate and complete.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-800 transition-colors flex items-center justify-center gap-2"
                  disabled={isSubmitting}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={!isReviewed || isSubmitting}
                  className={`flex-1 sm:flex-none px-8 py-2.5 rounded-lg text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95
                                        ${isReviewed && !isSubmitting
                      ? "bg-[#3d6a8f] text-white hover:bg-[#2d5a8f] hover:shadow-lg"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                >
                  {isSubmitting ? <>Loading...</> : <>Submit</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}