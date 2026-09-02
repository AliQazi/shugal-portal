import UmrahPackageBooking from "../models/UmrahPackageBooking.js";
import Register from "../models/Register.js";
import { cloudinary } from "../config/cloudinary.js";
import {
  sendBookingNotificationEmail,
  sendBookingStatusChangeEmail,
} from "../utils/emailService.js";
import { createAbidAirPackageBooking } from "./abidair.controller.js";
import {
  createTravelNetworkUmrahBooking,
  getTravelNetworkCreatedById,
} from "./travel-network.controller.js";

const isAbidAirPackage = (source) =>
  [
    "abidair",
    "abid-air",
    "abidairtravel",
    "abid-air-travel",
    "abidairtravels",
    "abid-air-travels",
  ].includes(
    String(source || "")
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-"),
  );

const isTravelNetworkPackage = (source) =>
  ["travel-network", "travelnetwork", "travel-net", "tn"].includes(
    String(source || "")
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-"),
  );

const toIsoDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toISOString().split("T")[0];
};

const getSharingValue = (roomType) => {
  const normalized = String(roomType || "").toLowerCase().trim();
  const occupancies = { double: 2, triple: 3, quad: 4, quint: 5 };
  if (occupancies[normalized]) return occupancies[normalized];

  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 2;
};

const getPassengerAmount = (passenger, parsedPricing, packageSnapshot) => {
  const type = String(passenger?.type || "Adult").toLowerCase();
  const rates =
    packageSnapshot?.rooms ||
    packageSnapshot?.rates ||
    packageSnapshot?.packageRates ||
    {};

  if (type.startsWith("child")) {
    return Number(
      rates.child_without_bed ||
      rates.childWithoutBed ||
      packageSnapshot?.childPrice ||
      0,
    );
  }

  if (type.startsWith("infant")) {
    return Number(rates.infant || packageSnapshot?.infantPrice || 0);
  }

  return Number(parsedPricing?.pricePerPerson || 0);
};

const buildAbidAirPackagePayload = ({
  packageId,
  roomType,
  specialRequests,
  passengers,
  parsedPricing,
  packageSnapshot,
}) => ({
  package_id: Number.isNaN(Number(packageId)) ? packageId : Number(packageId),
  sharing: getSharingValue(roomType),
  agentremarks:
    specialRequests ||
    `${String(roomType || "Sharing")} room booking`,
  passengers: passengers.map((passenger) => {
    const type = String(passenger?.type || "Adult").toLowerCase();
    return {
      surname: String(passenger?.surName || passenger?.surname || "").toUpperCase(),
      givenname: String(
        passenger?.givenName || passenger?.givenname || "",
      ).toUpperCase(),
      title: String(passenger?.title || "MR").toUpperCase(),
      passport: passenger?.passport || "",
      dob: toIsoDate(passenger?.dateOfBirth || passenger?.dob),
      doe: toIsoDate(passenger?.passportExpiry || passenger?.doe),
      person_type: type.startsWith("infant")
        ? "I"
        : type.startsWith("child")
          ? "C"
          : "A",
      package_book_amount: getPassengerAmount(
        passenger,
        parsedPricing,
        packageSnapshot,
      ),
    };
  }),
});

const getTravelNetworkPricePlan = ({
  packageSnapshot,
  packageId,
  roomType,
  parsedPricing,
}) => {
  const plans =
    packageSnapshot?.umrah_package_price_plans ||
    packageSnapshot?.price_plans ||
    packageSnapshot?.pricePlans ||
    [];
  const normalizedRoomType = String(roomType || "sharing").toLowerCase().trim();
  const selectedPlan =
    packageSnapshot?.umrah_package_price_plan ||
    packageSnapshot?.selected_price_plan ||
    packageSnapshot?.selectedPricePlan ||
    packageSnapshot?.price_plan ||
    packageSnapshot?.pricePlan ||
    (Array.isArray(plans)
      ? plans.find(
          (plan) =>
            String(plan?.type || plan?.name || "").toLowerCase().trim() ===
            normalizedRoomType,
        )
      : null) ||
    {};
  const rates =
    packageSnapshot?.rooms ||
    packageSnapshot?.rates ||
    packageSnapshot?.packageRates ||
    {};

  return {
    id: Number(
      selectedPlan.id ??
        selectedPlan.price_plan_id ??
        selectedPlan.package_price_plan_id ??
        packageSnapshot?.price_plan_id ??
        packageSnapshot?.package_id ??
        packageSnapshot?.id ??
        packageId,
    ),
    type: String(selectedPlan.type || selectedPlan.name || normalizedRoomType),
    adult: Number(
      selectedPlan.adult ??
        selectedPlan.price ??
        selectedPlan.amount ??
        parsedPricing?.pricePerPerson ??
        0,
    ),
    child: Number(
      selectedPlan.child ??
        selectedPlan.child_price ??
        rates.child_without_bed ??
        rates.childWithoutBed ??
        packageSnapshot?.childPrice ??
        0,
    ),
    infant: Number(
      selectedPlan.infant ??
        selectedPlan.infant_price ??
        rates.infant ??
        packageSnapshot?.infantPrice ??
        0,
    ),
  };
};

const buildTravelNetworkUmrahPayload = ({
  packageId,
  roomType,
  specialRequests,
  passengers,
  parsedPricing,
  packageSnapshot,
  adultsCount,
  childrenCount,
  infantsCount,
}) => {
  const createdById = getTravelNetworkCreatedById();
  const groupId = Number(
    packageSnapshot?.group_id ??
      packageSnapshot?.groupId ??
      packageSnapshot?.group?.id,
  );
  const normalizedPackageId = Number(packageId);

  return {
    group_id: groupId,
    package_id: normalizedPackageId,
    agency_info: {
      agency_name:
        process.env.name_travelnetwork?.trim() ||
        process.env.name?.trim() ||
        "",
      agent_name:
        process.env.name_travelnetwork?.trim() ||
        process.env.name?.trim() ||
        "",
      created_by_id: createdById,
      email:
        process.env.email_travelnetwork?.trim() ||
        process.env.email?.trim() ||
        "",
      mobile:
        process.env.mobile_travelnetwork?.trim() ||
        process.env.mobile_no?.trim() ||
        "",
      adults: Number(adultsCount) || 0,
      child: Number(childrenCount) || 0,
      infant: Number(infantsCount) || 0,
      agent_notes: specialRequests || "",
    },
    booking_details: passengers.map((passenger) => ({
      type: String(passenger?.type || "Adult"),
      title: String(passenger?.title || "MR").toUpperCase(),
      surname: String(
        passenger?.surName || passenger?.surname || "",
      ).toUpperCase(),
      given_name: String(
        passenger?.givenName || passenger?.given_name || "",
      ).toUpperCase(),
      passport_no:
        passenger?.passport || passenger?.passport_no || "",
      dob: toIsoDate(passenger?.dateOfBirth || passenger?.dob),
      doe: toIsoDate(passenger?.passportExpiry || passenger?.doe),
    })),
    umrah_package_price_plan: getTravelNetworkPricePlan({
      packageSnapshot,
      packageId,
      roomType,
      parsedPricing,
    }),
  };
};

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

    const abidAirBooking = isAbidAirPackage(packageSource);
    const travelNetworkBooking = isTravelNetworkPackage(packageSource);
    const expectedPassengerCount =
      (Number(adultsCount) || 0) +
      (Number(childrenCount) || 0) +
      (Number(infantsCount) || 0);

    if (
      (abidAirBooking || travelNetworkBooking) &&
      passengers.length !== expectedPassengerCount
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Complete passenger details are required for every external package passenger.",
      });
    }

    if ((abidAirBooking || travelNetworkBooking) && !packageId) {
      return res.status(400).json({
        success: false,
        message: "External package ID is required.",
      });
    }

    const incompletePassengerIndex = passengers.findIndex(
      (passenger) =>
        !passenger?.surName ||
        !passenger?.givenName ||
        !passenger?.passport ||
        !passenger?.dateOfBirth ||
        !passenger?.passportExpiry,
    );
    if (
      (abidAirBooking || travelNetworkBooking) &&
      incompletePassengerIndex !== -1
    ) {
      return res.status(400).json({
        success: false,
        message: `Complete the name, passport, DOB and passport expiry for passenger ${incompletePassengerIndex + 1}.`,
      });
    }

    let providerResponse = null;
    if (abidAirBooking) {
      const providerPayload = buildAbidAirPackagePayload({
        packageId,
        roomType,
        specialRequests,
        passengers,
        parsedPricing,
        packageSnapshot: parsedPackageData,
      });

      try {
        providerResponse = await createAbidAirPackageBooking(providerPayload);
      } catch (providerError) {
        const providerMessage =
          providerError.response?.data?.message ||
          providerError.response?.data?.error ||
          providerError.message;
        return res.status(providerError.response?.status || 502).json({
          success: false,
          message: providerMessage || "Abid Air package booking failed.",
        });
      }

      if (!providerResponse?.success) {
        return res.status(409).json({
          success: false,
          message:
            providerResponse?.message || "Abid Air did not accept the package booking.",
        });
      }
    }

    if (travelNetworkBooking) {
      const providerPayload = buildTravelNetworkUmrahPayload({
        packageId,
        roomType,
        specialRequests,
        passengers,
        parsedPricing,
        packageSnapshot: parsedPackageData,
        adultsCount,
        childrenCount,
        infantsCount,
      });

      if (
        !Number.isInteger(providerPayload.group_id) ||
        !Number.isInteger(providerPayload.package_id) ||
        !Number.isInteger(providerPayload.agency_info.created_by_id) ||
        !Number.isInteger(providerPayload.umrah_package_price_plan.id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Travel Network group, package, agency and price plan IDs are required.",
        });
      }

      try {
        providerResponse =
          await createTravelNetworkUmrahBooking(providerPayload);
      } catch (providerError) {
        const providerMessage =
          providerError.response?.data?.message ||
          providerError.response?.data?.error ||
          providerError.message;
        return res.status(providerError.response?.status || 502).json({
          success: false,
          message:
            providerMessage || "Travel Network Umrah booking failed.",
        });
      }
    }

    const booking = new UmrahPackageBooking({
      user: userId,
      package: packageId && packageId.length === 24 ? packageId : undefined,
      packageName,
      packageSource: packageSource || "local",
      providerBookingStatus:
        abidAirBooking || travelNetworkBooking ? "success" : "not_applicable",
      providerPackageBookingId:
        providerResponse?.package_booking_id?.toString?.() || null,
      providerTicketId: providerResponse?.ticket_id?.toString?.() || null,
      providerBookingResponse: providerResponse,
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
    }).populate("user", "name email phone companyName agencyCode logo").lean();
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
      .populate("user", "name email phone companyName agencyCode logo")
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

    const oldStatus = booking.status;

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

    if (String(status).toLowerCase() !== "confirmed") {
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

    if (oldStatus !== status) {
      try {
        const agent = await Register.findById(booking.user)
          .select("name email agencyCode companyName phone")
          .lean();
        await sendBookingStatusChangeEmail({
          bookingType: "Umrah Package",
          booking,
          agent,
          oldStatus,
          newStatus: status,
          changedBy: req.user?.name || req.user?.email || "System",
        });
      } catch (emailErr) {
        console.error("sendBookingStatusChangeEmail failed:", emailErr?.message || emailErr);
      }
    }

    const [bookingWithContact] = await attachShaheenWingsContact([booking]);
    res.json({ success: true, data: bookingWithContact });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
