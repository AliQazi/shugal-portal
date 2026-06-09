import UmrahPackageBooking from "../models/UmrahPackageBooking.js";
import Register from "../models/Register.js";
import { cloudinary } from "../config/cloudinary.js";
import { sendBookingNotificationEmail } from "../utils/emailService.js";

/* ────────────────────────────────────────────────────────
   CREATE BOOKING  POST /api/umrah-package-bookings/create
──────────────────────────────────────────────────────── */
export const createUmrahPackageBooking = async (req, res) => {
  try {
    const userId = req.user._id;

    const {
      packageId,
      packageName,
      packageSource,
      pnr,
      roomType,
      specialRequests,
      pricing,
      packageData,
      adultsCount,
      childrenCount,
      infantsCount,
    } = req.body;

    let passengers = [];
    if (req.body.passengers) {
      if (typeof req.body.passengers === "string") {
        try {
          passengers = JSON.parse(req.body.passengers);
        } catch (parseErr) {
          passengers = [];
        }
      } else if (Array.isArray(req.body.passengers)) {
        passengers = req.body.passengers;
      }
    }

    if (!passengers.length) {
      const passengerMap = {};
      for (const key of Object.keys(req.body)) {
        const match = key.match(/^passengers\[(\d+)\]\[(\w+)\]$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          const field = match[2];
          if (!passengerMap[idx]) passengerMap[idx] = {};
          passengerMap[idx][field] = req.body[key];
        }
      }
      passengers = Object.values(passengerMap);
    }

    // Upload passport files to Cloudinary
    if (req.files) {
      for (const [fieldName, files] of Object.entries(req.files)) {
        const matchIdx = fieldName.match(/^passportFile_(\d+)$/);
        if (!matchIdx) continue;
        const idx = parseInt(matchIdx[1], 10);
        if (!passengers[idx]) continue;
        const file = Array.isArray(files) ? files[0] : files;
        if (file && file.path) {
          passengers[idx].passportFileUrl = file.path; // Cloudinary URL
        }
      }
    }

    let parsedPricing = {};
    if (pricing) {
      if (typeof pricing === "string") {
        try {
          parsedPricing = JSON.parse(pricing);
        } catch {
          parsedPricing = {};
        }
      } else if (typeof pricing === "object") {
        parsedPricing = pricing;
      }
    }

    if (!parsedPricing.pricePerPerson && !parsedPricing.totalAmount) {
      for (const key of Object.keys(req.body)) {
        const match = key.match(/^pricing\[(\w+)\]$/);
        if (match) {
          parsedPricing[match[1]] = req.body[key];
        }
      }
    }

    const parsedPackageData = typeof packageData === "string" ? JSON.parse(packageData) : packageData;

    const pricingTotal = Number(parsedPricing?.totalAmount || 0);
    const pricingDiscount = Number(parsedPricing?.discountAmount || 0);
    const pricingOriginal = Number(parsedPricing?.originalTotalAmount || 0) || pricingTotal + pricingDiscount;

    const booking = new UmrahPackageBooking({
      user: userId,
      package: packageId && packageId.length === 24 ? packageId : undefined,
      packageName,
      packageSource: packageSource || "local",
      pnr: pnr || parsedPackageData?.pnr || "",
      packageData: parsedPackageData,
      roomType,
      adultsCount: Number(adultsCount) || 0,
      childrenCount: Number(childrenCount) || 0,
      infantsCount: Number(infantsCount) || 0,
      passengers,
      specialRequests,
      pricing: {
        pricePerPerson: Number(parsedPricing?.pricePerPerson || 0),
        currency: parsedPricing?.currency || "PKR",
        totalAmount: Math.max(0, pricingOriginal - pricingDiscount),
        discountAmount: pricingDiscount,
        originalTotalAmount: pricingOriginal,
      },
    });

    await booking.save();

    // If this booking is already created as confirmed, record a margin ledger entry.
    if (booking.status === "confirmed") {
      try {
        const { default: MarginLedger } = await import("../models/MarginLedger.js");
        const { recordBookingMarginLedger } = await import("./groupMargin.controller.js");
        const { default: Margin } = await import("../models/Margin.js");
        const latestMargin = await Margin.findOne({}).sort({ createdAt: -1 }).lean();
        const ledgerBooking = prepareUmrahBookingForLedger(booking);
        await recordBookingMarginLedger({ booking: ledgerBooking, globalMargin: latestMargin });
      } catch (ledgerErr) {
        console.error("createUmrahPackageBooking ledger write failed:", ledgerErr?.message || ledgerErr);
      }
    }

    try {
      await sendBookingNotificationEmail({
        bookingType: "Umrah Package",
        booking,
        agent: req.user,
      });
    } catch (emailErr) {
      console.error("sendBookingNotificationEmail failed:", emailErr?.message || emailErr);
    }

    res.status(201).json({
      success: true,
      message: "Booking submitted successfully",
      data: { bookingNumber: booking.bookingNumber, _id: booking._id },
    });
  } catch (err) {
    console.error("createUmrahPackageBooking error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ──────────────────────────────────────────────────────────────────
   GET MY BOOKINGS  GET /api/umrah-package-bookings/my
────────────────────────────────────────────────────────────────── */
export const getMyUmrahPackageBookings = async (req, res) => {
  try {
    const bookings = await UmrahPackageBooking.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: await attachShaheenWingsContact(bookings) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ──────────────────────────────────────────────────────────────────
   GET ONE BOOKING  GET /api/umrah-package-bookings/:id
────────────────────────────────────────────────────────────────── */
export const getUmrahPackageBookingById = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("user", "name email phone companyName agencyCode").lean();
    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });
    const [bookingWithContact] = await attachShaheenWingsContact([booking]);
    res.json({ success: true, data: bookingWithContact });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ──────────────────────────────────────────────────────────────
   ADMIN: GET ALL  GET /api/umrah-package-bookings/admin/all
────────────────────────────────────────────────────────────── */
export const adminGetAllBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const total = await UmrahPackageBooking.countDocuments(filter);
    const bookings = await UmrahPackageBooking.find(filter)
      .populate("user", "name email phone companyName agencyCode")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({ success: true, data: await attachShaheenWingsContact(bookings), total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getShaheenWingsAdminContact = async () => {
  const configuredPhone =
    process.env.SHAHEENWINGS_PHONE ||
    process.env.ADMIN_PHONE ||
    process.env.CONTACT_PHONE ||
    "";

  if (configuredPhone) {
    return {
      name: process.env.SHAHEENWINGS_NAME || "Shaheen Wings Travels",
      phone: configuredPhone,
    };
  }

  const admin = await Register.findOne({ role: "Admin" })
    .sort({ updatedAt: -1 })
    .select("name phone companyName")
    .lean();

  return {
    name: admin?.companyName || admin?.name || "Shaheen Wings Travels",
    phone: admin?.phone || "",
  };
};

const attachShaheenWingsContact = async (bookings) => {
  const contact = await getShaheenWingsAdminContact();
  return bookings.map((booking) => {
    const bookingData = typeof booking.toObject === "function" ? booking.toObject() : booking;
    return {
      ...bookingData,
      shaheenWingsContact: contact,
    };
  });
};

const prepareUmrahBookingForLedger = (booking) => {
  const ledgerBooking = typeof booking.toObject === "function" ? booking.toObject() : { ...booking };
  const packageData = ledgerBooking.packageData || {};
  const flight = Array.isArray(packageData.flights) ? packageData.flights[0] : packageData.flights || {};

  ledgerBooking.bookingReference = ledgerBooking.bookingReference || ledgerBooking.bookingNumber || "";
  ledgerBooking.groupId = String(
    ledgerBooking.package ||
    ledgerBooking.packageData?._id ||
    ledgerBooking.packageData?.id ||
    ledgerBooking.bookingNumber ||
    ledgerBooking.bookingReference ||
    ledgerBooking._id ||
    "umrah"
  );
  ledgerBooking.userId = ledgerBooking.user || ledgerBooking.userId || null;
  ledgerBooking.source = String(ledgerBooking.packageSource || ledgerBooking.source || "local").toLowerCase();
  ledgerBooking.sector = ledgerBooking.sector || (flight ? `${flight.sectorFrom || ""}-${flight.sectorTo || ""}`.toUpperCase().replace(/^-|-$|\s/g, "") : "");
  ledgerBooking.flights = ledgerBooking.flights || packageData.flights || [];
  ledgerBooking.departureDate = ledgerBooking.departureDate || flight?.depDate || null;
  ledgerBooking.pricing = {
    ...ledgerBooking.pricing,
    adultPrice: Number(ledgerBooking.pricing?.pricePerPerson || ledgerBooking.pricing?.adultPrice || 0),
    adultBasePrice: Number(ledgerBooking.pricing?.pricePerPerson || ledgerBooking.pricing?.adultBasePrice || ledgerBooking.pricing?.adultPrice || 0),
    grandTotal: Number(ledgerBooking.pricing?.totalAmount || ledgerBooking.pricing?.grandTotal || 0),
  };
  ledgerBooking.adultsCount = Array.isArray(ledgerBooking.passengers)
    ? ledgerBooking.passengers.filter((p) => String(p.type).toLowerCase() === "adult").length
    : 0;
  ledgerBooking.childrenCount = Array.isArray(ledgerBooking.passengers)
    ? ledgerBooking.passengers.filter((p) => String(p.type).toLowerCase() === "child").length
    : 0;
  return ledgerBooking;
};

/* ──────────────────────────────────────────────────────────────────
   AGENT: UPDATE PASSENGERS  PUT /api/umrah-package-bookings/:id/passengers
──────────────────────────────────────────────────────────────────── */
export const updateUmrahBookingPassengers = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });

    if (!["pending"].includes(booking.status))
      return res.status(400).json({ success: false, message: "Can only edit pending bookings" });

    let passengers = [];
    if (req.body.passengers) {
      if (typeof req.body.passengers === "string") {
        try { passengers = JSON.parse(req.body.passengers); } catch { passengers = []; }
      } else if (Array.isArray(req.body.passengers)) {
        passengers = req.body.passengers;
      }
    }

    // Upload any new passport files to Cloudinary
    if (req.files) {
      for (const [fieldName, files] of Object.entries(req.files)) {
        const matchIdx = fieldName.match(/^passportFile_(\d+)$/);
        if (!matchIdx) continue;
        const idx = parseInt(matchIdx[1], 10);
        if (!passengers[idx]) continue;
        const file = Array.isArray(files) ? files[0] : files;
        if (file && file.path) {
          passengers[idx].passportFileUrl = file.path;
        }
      }
    }

    booking.passengers = passengers;
    await booking.save();

    const [bookingWithContact] = await attachShaheenWingsContact([booking]);
    res.json({ success: true, message: "Passenger details updated", data: bookingWithContact });
  } catch (err) {
    console.error("updateUmrahBookingPassengers error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────────────────────────────────────────
   ADMIN: UPDATE STATUS  PATCH /api/umrah-package-bookings/admin/:id/status
──────────────────────────────────────────────────────────────────── */
export const adminUpdateBookingStatus = async (req, res) => {
  try {
    const { status, adminNote, discountAmount } = req.body;
    const booking = await UmrahPackageBooking.findById(req.params.id);
    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });

    if (discountAmount !== undefined) {
      const discountValue = Number(discountAmount || 0);
      if (Number.isNaN(discountValue) || discountValue < 0)
        throw new Error("Invalid discount amount");

      const existingDiscount = Number(booking.pricing?.discountAmount || 0);
      const originalTotal =
        Number(booking.pricing?.originalTotalAmount || 0) ||
        Number(booking.pricing?.totalAmount || 0) + existingDiscount;

      booking.pricing.discountAmount = discountValue;
      booking.pricing.originalTotalAmount = originalTotal;
      booking.pricing.totalAmount = Math.max(0, originalTotal - discountValue);
    }

    booking.status = status;
    if (adminNote !== undefined) booking.adminNote = adminNote;
    await booking.save();
    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });

    if (String(status).toLowerCase() === "confirmed") {
      try {
        const { recordBookingMarginLedger } = await import("./groupMargin.controller.js");
        const { default: Margin } = await import("../models/Margin.js");
        const latestMargin = await Margin.findOne({}).sort({ createdAt: -1 }).lean();
        const ledgerBooking = prepareUmrahBookingForLedger(booking);
        await recordBookingMarginLedger({ booking: ledgerBooking, globalMargin: latestMargin });
      } catch (ledgerErr) {
        console.error("adminUpdateBookingStatus ledger write failed:", ledgerErr?.message || ledgerErr);
      }
    }

    if (String(status).toLowerCase() === "cancelled") {
      try {
        const { default: MarginLedger } = await import("../models/MarginLedger.js");
        await MarginLedger.deleteMany({
          entryType: "booking_confirmed",
          $or: [
            { bookingId: booking._id },
            { bookingId: String(booking._id) },
            { bookingReference: booking.bookingReference },
            { bookingReference: booking.bookingNumber },
          ],
        });
      } catch (ledgerErr) {
        console.error("adminUpdateBookingStatus ledger cleanup failed:", ledgerErr?.message || ledgerErr);
      }
    }

    const [bookingWithContact] = await attachShaheenWingsContact([booking]);
    res.json({ success: true, data: bookingWithContact });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
