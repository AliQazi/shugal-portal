import UmrahPackageBooking from "../models/UmrahPackageBooking.js";
import { cloudinary } from "../config/cloudinary.js";

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
      roomType,
      specialRequests,
      pricing,
      packageData,
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

    const booking = new UmrahPackageBooking({
      user: userId,
      package: packageId && packageId.length === 24 ? packageId : undefined,
      packageName,
      packageSource: packageSource || "local",
      packageData: parsedPackageData,
      roomType,
      passengers,
      specialRequests,
      pricing: {
        pricePerPerson: Number(parsedPricing?.pricePerPerson || 0),
        currency: parsedPricing?.currency || "PKR",
        totalAmount: Number(parsedPricing?.totalAmount || 0),
      },
    });

    await booking.save();

    // If this booking is already created as confirmed, record a margin ledger entry.
    if (booking.status === "confirmed") {
      try {
        const { default: MarginLedger } = await import("../models/MarginLedger.js");
        const existingLedger = await MarginLedger.findOne({
          entryType: "booking_confirmed",
          bookingId: booking._id,
        }).lean();

        if (!existingLedger) {
          const { recordBookingMarginLedger } = await import("./groupMargin.controller.js");
          const { default: Margin } = await import("../models/Margin.js");
          const latestMargin = await Margin.findOne({}).sort({ createdAt: -1 }).lean();
          const ledgerBooking = prepareUmrahBookingForLedger(booking);
          await recordBookingMarginLedger({ booking: ledgerBooking, globalMargin: latestMargin });
        }
      } catch (ledgerErr) {
        console.error("createUmrahPackageBooking ledger write failed:", ledgerErr?.message || ledgerErr);
      }
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
    res.json({ success: true, data: bookings });
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
    }).lean();
    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });
    res.json({ success: true, data: booking });
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
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({ success: true, data: bookings, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
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

/* ────────────────────────────────────────────────────────────────────
   ADMIN: UPDATE STATUS  PATCH /api/umrah-package-bookings/admin/:id/status
──────────────────────────────────────────────────────────────────── */
export const adminUpdateBookingStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const booking = await UmrahPackageBooking.findByIdAndUpdate(
      req.params.id,
      { status, ...(adminNote !== undefined && { adminNote }) },
      { new: true }
    );
    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });

    if (String(status).toLowerCase() === "confirmed") {
      try {
        const { default: MarginLedger } = await import("../models/MarginLedger.js");
        const existingLedger = await MarginLedger.findOne({
          entryType: "booking_confirmed",
          bookingId: booking._id,
        }).lean();

        if (!existingLedger) {
          const { recordBookingMarginLedger } = await import("./groupMargin.controller.js");
          const { default: Margin } = await import("../models/Margin.js");
          const latestMargin = await Margin.findOne({}).sort({ createdAt: -1 }).lean();
          const ledgerBooking = prepareUmrahBookingForLedger(booking);
          await recordBookingMarginLedger({ booking: ledgerBooking, globalMargin: latestMargin });
        }
      } catch (ledgerErr) {
        console.error("adminUpdateBookingStatus ledger write failed:", ledgerErr?.message || ledgerErr);
      }
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
