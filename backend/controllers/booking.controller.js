// import Booking from "../models/Booking.js";
// import GroupTicketing from "../models/GroupTicketing.js";
// import mongoose from "mongoose";

// const HOLD_DURATION = 2 * 60 * 60 * 1000; // 2 hours

// // const adjustSeatsIfLocalGroup = async (groupId, seatChange, session, checkAvailability = false) => {
// //   if (!mongoose.Types.ObjectId.isValid(groupId)) return; // External group → ignore

// //   const query = { _id: groupId };

// //   if (checkAvailability && seatChange < 0) {
// //     query.totalSeats = { $gte: Math.abs(seatChange) };
// //   }

// //   const result = await GroupTicketing.updateOne(
// //     query,
// //     { $inc: { totalSeats: seatChange } },
// //     { session }
// //   );

// //   if (result.matchedCount === 0) return; // Not stored locally → ignore
// //   if (checkAvailability && result.modifiedCount === 0)
// //     throw new Error("Not enough seats available");
// // };

// const adjustSeatsIfLocalGroup = async (groupId, seatChange, checkAvailability = false) => {
//   if (!mongoose.Types.ObjectId.isValid(groupId)) return; // External group

//   const query = { _id: groupId };

//   if (checkAvailability && seatChange < 0) {
//     query.totalSeats = { $gte: Math.abs(seatChange) };
//   }

//   const result = await GroupTicketing.updateOne(query, {
//     $inc: { totalSeats: seatChange }
//   });

//   if (result.matchedCount === 0) return; // Not local
//   if (checkAvailability && result.modifiedCount === 0)
//     throw new Error("Not enough seats available");
// };

// /* =========================================================
//    CREATE BOOKING
// ========================================================= */
// // export const createBooking = async (req, res) => {
// //   const session = await mongoose.startSession();
// //   session.startTransaction();

// //   try {
// //     const {
// //       groupId, groupType, airline, sector, pnr, contactPersonName,
// //       adultsCount, childrenCount, infantsCount, totalPassengers,
// //       pricing, passengers, flights, departureDate, arrivalDate
// //     } = req.body;

// //     if (passengers.length !== totalPassengers)
// //       throw new Error("Passenger mismatch");

// //     const calculatedTotal =
// //       pricing.adultTotal + pricing.childTotal + pricing.infantTotal;

// //     if (Math.abs(calculatedTotal - pricing.grandTotal) > 0.01)
// //       throw new Error("Price mismatch");

// //     const seatCount = adultsCount + childrenCount;
// //     const expiresAt = new Date(Date.now() + HOLD_DURATION);

// //     // Reduce seats ONLY if local group
// //     await adjustSeatsIfLocalGroup(groupId, -seatCount, session, true);

// //     const [booking] = await Booking.create([{
// //       groupId, groupType, airline, sector, pnr, contactPersonName,
// //       adultsCount, childrenCount, infantsCount, totalPassengers,
// //       pricing, passengers, flights, departureDate, arrivalDate,
// //       userId: req.user._id,
// //       status: "on hold",
// //       expiresAt
// //     }], { session });

// //     await session.commitTransaction();
// //     session.endSession();

// //     res.status(201).json({ success: true, data: booking });

// //   } catch (err) {
// //     await session.abortTransaction();
// //     session.endSession();
// //     res.status(400).json({ success: false, message: err.message });
// //   }
// // };

// export const createBooking = async (req, res) => {
//   let seatCount = 0;
//   let booking = null;

//   try {
//     const {
//       groupId, groupType, airline, sector, pnr, contactPersonName,
//       adultsCount, childrenCount, infantsCount, totalPassengers,
//       pricing, passengers, flights, departureDate, arrivalDate
//     } = req.body;

//     if (passengers.length !== totalPassengers)
//       throw new Error("Passenger mismatch");

//     const calculatedTotal =
//       pricing.adultTotal + pricing.childTotal + pricing.infantTotal;

//     if (Math.abs(calculatedTotal - pricing.grandTotal) > 0.01)
//       throw new Error("Price mismatch");

//     seatCount = adultsCount + childrenCount;
//     const expiresAt = new Date(Date.now() + HOLD_DURATION);

//     // STEP 1 — Deduct seats safely
//     await adjustSeatsIfLocalGroup(groupId, -seatCount, true);

//     // STEP 2 — Create booking
//     booking = await Booking.create({
//       groupId, groupType, airline, sector, pnr, contactPersonName,
//       adultsCount, childrenCount, infantsCount, totalPassengers,
//       pricing, passengers, flights, departureDate, arrivalDate,
//       userId: req.user._id,
//       status: "on hold",
//       expiresAt
//     });

//     res.status(201).json({ success: true, data: booking });

//   } catch (err) {
//     // ROLLBACK seats if booking failed AFTER deduction
//     if (seatCount > 0) {
//       await adjustSeatsIfLocalGroup(req.body.groupId, seatCount).catch(() => { });
//     }

//     res.status(400).json({ success: false, message: err.message });
//   }
// };

// /* =========================================================
//    GET ALL BOOKINGS
// ========================================================= */
// export const getAllBookings = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, status, sector, airline, fromDate, search } = req.query;
//     const query = {};

//     if (status) query.status = status;
//     if (sector) query.sector = sector;
//     if (airline) query["airline.name"] = airline;
//     if (fromDate) query.departureDate = { $gte: new Date(fromDate) };

//     if (search) {
//       query.$or = [
//         { bookingReference: { $regex: search, $options: "i" } },
//         { contactPersonName: { $regex: search, $options: "i" } },
//         { pnr: { $regex: search, $options: "i" } }
//       ];
//     }

//     if (req.user.role !== "Admin") query.userId = req.user._id;

//     const skip = (page - 1) * limit;

//     const bookings = await Booking.find(query)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(Number(limit))
//       .populate("userId", "name email agencyCode companyName");

//     const total = await Booking.countDocuments(query);

//     res.json({
//       success: true,
//       data: bookings,
//       pagination: {
//         currentPage: Number(page),
//         totalPages: Math.ceil(total / limit),
//         totalBookings: total
//       }
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Failed to fetch bookings" });
//   }
// };

// /* =========================================================
//    GET BOOKING BY ID
// ========================================================= */
// export const getBookingById = async (req, res) => {
//   try {
//     const booking = await Booking.findById(req.params.id)
//       .populate("userId", "name email agencyCode companyName");

//     if (!booking)
//       return res.status(404).json({ success: false, message: "Booking not found" });

//     if (req.user.role !== "Admin" && booking.userId._id.toString() !== req.user._id.toString())
//       return res.status(403).json({ success: false, message: "Not authorized" });

//     res.json({ success: true, data: booking });
//   } catch {
//     res.status(500).json({ success: false, message: "Failed to fetch booking" });
//   }
// };

// /* =========================================================
//    GET BOOKING BY REFERENCE
// ========================================================= */
// export const getBookingByReference = async (req, res) => {
//   try {
//     const booking = await Booking.findOne({ bookingReference: req.params.reference })
//       .populate("userId", "name email agencyCode companyName");

//     if (!booking)
//       return res.status(404).json({ success: false, message: "Booking not found" });

//     if (req.user.role !== "Admin" && booking.userId._id.toString() !== req.user._id.toString())
//       return res.status(403).json({ success: false, message: "Not authorized" });

//     res.json({ success: true, data: booking });
//   } catch {
//     res.status(500).json({ success: false, message: "Failed to fetch booking" });
//   }
// };

// // export const updateBookingStatus = async (req, res) => {
// //   const session = await mongoose.startSession();
// //   session.startTransaction();

// //   try {
// //     const { status, notes } = req.body;
// //     const booking = await Booking.findById(req.params.id).session(session);
// //     if (!booking) throw new Error("Booking not found");

// //     const oldStatus = booking.status;
// //     const seats = booking.adultsCount + booking.childrenCount;

// //     if (oldStatus !== "cancelled" && status === "cancelled") {
// //       await adjustSeatsIfLocalGroup(booking.groupId, seats, session);
// //     }

// //     if (oldStatus === "cancelled" && status !== "cancelled") {
// //       await adjustSeatsIfLocalGroup(booking.groupId, -seats, session, true);
// //     }

// //     booking.status = status;
// //     booking.notes = notes ?? booking.notes;
// //     booking.expiresAt = status === "on hold"
// //       ? new Date(Date.now() + HOLD_DURATION)
// //       : null;

// //     await booking.save({ session });

// //     await session.commitTransaction();
// //     session.endSession();

// //     res.json({ success: true, data: booking });

// //   } catch (err) {
// //     await session.abortTransaction();
// //     session.endSession();
// //     res.status(400).json({ success: false, message: err.message });
// //   }
// // };

// export const updateBookingStatus = async (req, res) => {
//   try {
//     const { status, notes } = req.body;
//     const booking = await Booking.findById(req.params.id);
//     if (!booking) throw new Error("Booking not found");

//     const oldStatus = booking.status;
//     const seats = booking.adultsCount + booking.childrenCount;

//     // Restore seats if cancelling
//     if (oldStatus !== "cancelled" && status === "cancelled") {
//       await adjustSeatsIfLocalGroup(booking.groupId, seats);
//     }

//     // Deduct seats if reactivating
//     if (oldStatus === "cancelled" && status !== "cancelled") {
//       await adjustSeatsIfLocalGroup(booking.groupId, -seats, true);
//     }

//     booking.status = status;
//     booking.notes = notes ?? booking.notes;
//     booking.expiresAt = status === "on hold"
//       ? new Date(Date.now() + HOLD_DURATION)
//       : null;

//     await booking.save();

//     res.json({ success: true, data: booking });

//   } catch (err) {
//     res.status(400).json({ success: false, message: err.message });
//   }
// };

// /* =========================================================
//    UPDATE BOOKING DETAILS
// ========================================================= */
// // export const updateBooking = async (req, res) => {
// //   const session = await mongoose.startSession();
// //   session.startTransaction();

// //   try {
// //     const booking = await Booking.findById(req.params.id).session(session);
// //     if (!booking) throw new Error("Booking not found");

// //     if (booking.status !== "on hold")
// //       throw new Error("Only on-hold bookings can be edited");

// //     const oldSeats = booking.adultsCount + booking.childrenCount;

// //     Object.assign(booking, req.body);

// //     const newSeats = booking.adultsCount + booking.childrenCount;
// //     const diff = newSeats - oldSeats;

// //     if (diff !== 0) {
// //       await adjustSeatsIfLocalGroup(booking.groupId, -diff, session, diff > 0);
// //     }

// //     booking.expiresAt = booking.status === "on hold"
// //       ? new Date(Date.now() + HOLD_DURATION)
// //       : null;

// //     await booking.save({ session });

// //     await session.commitTransaction();
// //     session.endSession();

// //     res.json({ success: true, data: booking });

// //   } catch (err) {
// //     await session.abortTransaction();
// //     session.endSession();
// //     res.status(400).json({ success: false, message: err.message });
// //   }
// // };

// export const updateBooking = async (req, res) => {
//   try {
//     const booking = await Booking.findById(req.params.id);
//     if (!booking) throw new Error("Booking not found");
//     if (booking.status !== "on hold")
//       throw new Error("Only on-hold bookings can be edited");

//     const oldSeats = booking.adultsCount + booking.childrenCount;

//     Object.assign(booking, req.body);

//     const newSeats = booking.adultsCount + booking.childrenCount;
//     const diff = newSeats - oldSeats;

//     if (diff > 0) {
//       await adjustSeatsIfLocalGroup(booking.groupId, -diff, true);
//     } else if (diff < 0) {
//       await adjustSeatsIfLocalGroup(booking.groupId, Math.abs(diff));
//     }

//     booking.expiresAt = booking.status === "on hold"
//       ? new Date(Date.now() + HOLD_DURATION)
//       : null;
//     await booking.save();

//     res.json({ success: true, data: booking });

//   } catch (err) {
//     res.status(400).json({ success: false, message: err.message });
//   }
// };

// /* =========================================================
//    CANCEL BOOKING
// ========================================================= */
// // export const cancelBooking = async (req, res) => {
// //   const session = await mongoose.startSession();
// //   session.startTransaction();

// //   try {
// //     const booking = await Booking.findById(req.params.id).session(session);
// //     if (!booking) throw new Error("Booking not found");
// //     if (booking.status === "cancelled") throw new Error("Already cancelled");

// //     const seats = booking.adultsCount + booking.childrenCount;

// //     booking.status = "cancelled";
// //     booking.expiresAt = null;
// //     await booking.save({ session });

// //     await adjustSeatsIfLocalGroup(booking.groupId, seats, session);

// //     await session.commitTransaction();
// //     session.endSession();

// //     res.json({ success: true, message: "Booking cancelled", data: booking });

// //   } catch (err) {
// //     await session.abortTransaction();
// //     session.endSession();
// //     res.status(400).json({ success: false, message: err.message });
// //   }
// // };

// export const cancelBooking = async (req, res) => {
//   try {
//     const booking = await Booking.findById(req.params.id);
//     if (!booking) throw new Error("Booking not found");
//     if (booking.status === "cancelled") throw new Error("Already cancelled");

//     const seats = booking.adultsCount + booking.childrenCount;

//     booking.status = "cancelled";
//     booking.expiresAt = null;
//     await booking.save();

//     await adjustSeatsIfLocalGroup(booking.groupId, seats);

//     res.json({ success: true, message: "Booking cancelled", data: booking });

//   } catch (err) {
//     res.status(400).json({ success: false, message: err.message });
//   }
// };

// /* =========================================================
//    DELETE BOOKING (ADMIN ONLY)
// ========================================================= */
// // export const deleteBooking = async (req, res) => {
// //   const session = await mongoose.startSession();
// //   session.startTransaction();

// //   try {
// //     if (req.user.role !== "Admin") throw new Error("Not authorized");

// //     const booking = await Booking.findById(req.params.id).session(session);
// //     if (!booking) throw new Error("Booking not found");

// //     if (booking.status !== "cancelled") {
// //       const seats = booking.adultsCount + booking.childrenCount;
// //       await adjustSeatsIfLocalGroup(booking.groupId, seats, session);
// //     }

// //     await booking.deleteOne({ session });

// //     await session.commitTransaction();
// //     session.endSession();

// //     res.json({ success: true, message: "Booking deleted" });

// //   } catch (err) {
// //     await session.abortTransaction();
// //     session.endSession();
// //     res.status(400).json({ success: false, message: err.message });
// //   }
// // };

// export const deleteBooking = async (req, res) => {
//   try {
//     // if (req.user.role !== "Admin")
//     //   throw new Error("Not authorized");

//     const booking = await Booking.findById(req.params.id);
//     if (!booking) throw new Error("Booking not found");

//     if (booking.status !== "cancelled") {
//       const seats = booking.adultsCount + booking.childrenCount;
//       await adjustSeatsIfLocalGroup(booking.groupId, seats);
//     }

//     await booking.deleteOne();

//     res.json({ success: true, message: "Booking deleted" });

//   } catch (err) {
//     res.status(400).json({ success: false, message: err.message });
//   }
// };

// /* =========================================================
//    BOOKING STATISTICS (ADMIN DASHBOARD)
// ========================================================= */
// export const getBookingStatistics = async (req, res) => {
//   try {
//     const stats = await Booking.aggregate([
//       {
//         $group: {
//           _id: "$status",
//           count: { $sum: 1 },
//           revenue: { $sum: "$pricing.grandTotal" }
//         }
//       }
//     ]);

//     const totalBookings = await Booking.countDocuments();
//     const totalRevenue = await Booking.aggregate([
//       { $group: { _id: null, total: { $sum: "$pricing.grandTotal" } } }
//     ]);

//     res.json({
//       success: true,
//       data: {
//         byStatus: stats,
//         totalBookings,
//         totalRevenue: totalRevenue[0]?.total || 0
//       }
//     });
//   } catch {
//     res.status(500).json({ success: false, message: "Failed to fetch statistics" });
//   }
// };

import Booking from "../models/Booking.js";
import GroupTicketing from "../models/GroupTicketing.js";
import mongoose from "mongoose";
import Register from "../models/Register.js";
import { deductSeatsFromCache } from "../utils/cacheHelpers.js";
import { createSabaoonBooking } from "./sabaoon.controller.js";
import { createTravelNetworkBooking } from "./travel-network.controller.js";
import {
  createAbidAirFlightBooking,
  createAbidAirPackageBooking,
} from "./abidair.controller.js";
import {
  sendBookingNotificationEmail,
  sendBookingStatusChangeEmail,
} from "../utils/emailService.js";
import { bookGroupNCT, formatBookingForNCT } from "../utils/Group-Booking.js";

const HOLD_DURATION = 2 * 60 * 60 * 1000;
// -------------------------
// Helper Functions
// -------------------------
const isLocalGroup = (groupId) => mongoose.Types.ObjectId.isValid(groupId);
const normalizeGroupId = (groupId) => groupId?.toString();
const toIsoDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().split("T")[0];
};
const normalizeExternalSource = ({ source, groupId, groupPriceDetailId }) => {
  const normalizedRaw = String(source || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-");

  if (
    ["travel-network", "travelnetwork", "tn", "travel-net"].includes(
      normalizedRaw,
    )
  ) {
    return "travel-network";
  }

  if (
    ["al-haider", "alhaider", "al-haidar", "alhaidar"].includes(normalizedRaw)
  ) {
    return "al-haider";
  }

  if (
    ["sabaoon", "saboon", "saboor", "alsaboor", "al-saboor"].includes(
      normalizedRaw,
    )
  ) {
    return "sabaoon";
  }

  if (
    [
      "abidair",
      "abid-air",
      "abidairtravel",
      "abid-air-travel",
      "abidairtravels",
      "abid-air-travels",
    ].includes(normalizedRaw)
  ) {
    return "abidairtravel";
  }

  if (!normalizedRaw) {
    if (
      !isLocalGroup(groupId) &&
      groupPriceDetailId !== undefined &&
      groupPriceDetailId !== null
    ) {
      return "travel-network";
    }

    return isLocalGroup(groupId) ? "admin" : "sabaoon";
  }

  return normalizedRaw;
};

const toProviderPassenger = (passenger, fallbackType = "Adult") => {
  const type = String(passenger?.type || fallbackType);
  const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  const titleFallback = normalizedType === "Infant" ? "MSTR" : "MR";

  return {
    title: String(passenger?.title || titleFallback).toUpperCase(),
    surname: passenger?.surname || passenger?.surName || "",
    givenname:
      passenger?.givenname || passenger?.given_name || passenger?.givenName || "",
    passport:
      passenger?.passport || passenger?.passport_no || passenger?.passportNo || "",
    dob: toIsoDate(passenger?.dob || passenger?.dateOfBirth),
    doe: toIsoDate(passenger?.doe || passenger?.passportExpiry),
    nationality: passenger?.nationality || "Pakistan",
    type: normalizedType,
  };
};

const toAbidAirPersonType = (type) => {
  const normalizedType = String(type || "").toLowerCase();
  if (normalizedType.startsWith("child")) return "C";
  if (normalizedType.startsWith("infant")) return "I";
  if (normalizedType.includes("without")) return "WB";
  return "A";
};

const shouldBookAbidAirPackage = (reqBody) => {
  const explicitType = String(
    reqBody.abidAirBookingType ||
      reqBody.providerBookingType ||
      reqBody.bookingType ||
      "",
  )
    .toLowerCase()
    .trim();

  if (["package", "packagebooking", "package-booking"].includes(explicitType)) {
    return true;
  }

  if (["flight", "ticket", "flight-booking"].includes(explicitType)) {
    return false;
  }

  return Boolean(
    reqBody.package_id ||
      reqBody.packageId ||
      reqBody.packageData ||
      reqBody.sharing ||
      reqBody.selectedRoom ||
      reqBody.agentremarks ||
      reqBody.agentRemarks,
  );
};

const getPackagePassengerAmount = ({ passenger, pricing, index }) => {
  const type = String(passenger?.type || "Adult").toLowerCase();
  if (passenger?.package_book_amount !== undefined) {
    return Number(passenger.package_book_amount) || 0;
  }

  if (type.startsWith("child")) {
    return Number(pricing?.childBasePrice || pricing?.childPrice || 0);
  }

  if (type.startsWith("infant")) {
    return Number(pricing?.infantBasePrice || pricing?.infantPrice || 0);
  }

  if (Array.isArray(pricing?.packageBookAmounts)) {
    return Number(pricing.packageBookAmounts[index] || 0);
  }

  return Number(pricing?.adultBasePrice || pricing?.adultPrice || 0);
};

const buildAbidAirBookingRequest = ({
  reqBody,
  groupId,
  adultsCount,
  childrenCount,
  infantsCount,
  passengers,
  pricing,
}) => {
  const isPackageBooking = shouldBookAbidAirPackage(reqBody);
  const providerPassengers = passengers.map((passenger) =>
    toProviderPassenger(passenger),
  );

  if (!isPackageBooking) {
    return {
      type: "flight",
      payload: {
        adults: Number(adultsCount) || 0,
        childs: Number(childrenCount) || 0,
        infants: Number(infantsCount) || 0,
        passengers: providerPassengers.map(
          ({ title, surname, givenname, passport, dob, doe, nationality }) => ({
            title,
            surname,
            givenname,
            passport,
            dob,
            doe,
            nationality,
          }),
        ),
      },
    };
  }

  const packageId = reqBody.package_id || reqBody.packageId || groupId;
  const sharing =
    reqBody.sharing ||
    reqBody.packageData?.sharing ||
    reqBody.packageData?.selectedRoom ||
    reqBody.selectedRoom ||
    reqBody.roomType ||
    2;

  return {
    type: "package",
    payload: {
      package_id: Number.isNaN(Number(packageId)) ? packageId : Number(packageId),
      sharing: Number.isNaN(Number(sharing)) ? sharing : Number(sharing),
      agentremarks:
        reqBody.agentremarks ||
        reqBody.agentRemarks ||
        reqBody.notes ||
        `Booking ${reqBody.bookingReference || ""}`.trim(),
      passengers: providerPassengers.map((passenger, index) => ({
        surname: passenger.surname,
        givenname: passenger.givenname,
        title: passenger.title,
        passport: passenger.passport,
        dob: passenger.dob,
        doe: passenger.doe,
        person_type: toAbidAirPersonType(passenger.type),
        package_book_amount: getPackagePassengerAmount({
          passenger: passengers[index],
          pricing,
          index,
        }),
      })),
    },
  };
};

/**
 * Adjust seats for local groups (admin groups)
 *
 * This function is atomic and thread-safe using MongoDB's $inc operator.
 *
 * Positive seatChange: Releases seats (booking cancelled)
 * Negative seatChange: Deducts seats (booking created/on-hold)
 *
 * @param {String} groupId - MongoDB ObjectId of the GroupTicketing
 * @param {Number} seatChange - Seats to add (+) or remove (-)
 * @param {Boolean} checkAvailability - If true, throws error if insufficient seats
 *
 * @example
 * // Booking created with 2 passengers
 * await adjustSeatsIfLocalGroup(groupId, -2, true); // Check availability
 *
 * // Booking cancelled
 * await adjustSeatsIfLocalGroup(groupId, 2); // Release 2 seats
 */
const adjustSeatsIfLocalGroup = async (
  groupId,
  seatChange,
  checkAvailability = false,
) => {
  if (!isLocalGroup(groupId)) return; // External group → ignore

  const query = { _id: groupId };
  if (checkAvailability && seatChange < 0)
    query.totalSeats = { $gte: Math.abs(seatChange) };

  const result = await GroupTicketing.updateOne(query, {
    $inc: { totalSeats: seatChange },
  });

  if (result.matchedCount === 0) return; // Not local → ignore
  if (checkAvailability && result.modifiedCount === 0)
    throw new Error("Not enough seats available");

  // Log the seat adjustment
  console.log(
    `[SEAT ADJUSTMENT] GroupID: ${groupId}, Change: ${seatChange}, Success: ${result.modifiedCount > 0}`,
  );
};

const cleanupBookingMarginLedger = async ({ bookingId, bookingReference }) => {
  const { default: MarginLedger } = await import("../models/MarginLedger.js");
  const filter = {
    entryType: "booking_confirmed",
    $or: [{ bookingId }, { bookingId: bookingId?.toString?.() }],
  };

  if (bookingReference) {
    filter.$or.push({ bookingReference });
  }

  await MarginLedger.deleteMany(filter);
};

// -------------------------
// CREATE BOOKING
// -------------------------
/**
 * Creates a new booking with automatic seat deduction
 *
 * Flow:
 * 1. Validate passenger count and pricing
 * 2. Deduct seats from GroupTicketing (throws if insufficient)
 * 3. Create booking with "on hold" status
 * 4. Set expiry timer (30 minutes)
 * 5. Seats are automatically released if booking expires or is cancelled
 *
 * Seat Tracking:
 * - Only counts adults + children (infants don't occupy seats)
 * - Deducted immediately (GroupTicketing.totalSeats -= seats)
 * - Will be restored by cron job if booking expires
 * - Can be manually restored by cancellation
 *
 * @returns {Object} Booking document with auto-generated reference
 */
export const createBooking = async (req, res) => {
  let seatCount = 0;
  let booking = null;

  try {
    const {
      groupId: incomingGroupId,
      source,
      groupType,
      airline,
      sector,
      pnr,
      contactPersonName,
      adultsCount,
      childrenCount,
      infantsCount,
      totalPassengers,
      pricing,
      passengers,
      flights,
      departureDate,
      arrivalDate,
      group_price_detail_id,
      groupPriceDetailId,
    } = req.body;

    // Allow booking without passenger details (agent can fill in later)
    if (passengers.length > 0 && passengers.length !== totalPassengers)
      throw new Error("Passenger mismatch");

    const calculatedTotal =
      pricing.adultTotal + pricing.childTotal + pricing.infantTotal;
    if (Math.abs(calculatedTotal - pricing.grandTotal) > 0.01)
      throw new Error("Price mismatch");

    // ⭐ Only adults + children occupy seats (infants don't)
    seatCount = adultsCount + childrenCount;
    const expiresAt = new Date(Date.now() + HOLD_DURATION);
    const groupId = normalizeGroupId(incomingGroupId);
    const resolvedGroupPriceDetailId =
      group_price_detail_id ?? groupPriceDetailId ?? null;
    const bookingSource = normalizeExternalSource({
      source,
      groupId,
      groupPriceDetailId: resolvedGroupPriceDetailId,
    });

    const isSabaoonGroup =
      bookingSource === "sabaoon" && !isLocalGroup(groupId);
    const isTravelNetworkGroup =
      bookingSource === "travel-network" && !isLocalGroup(groupId);
    const isAbidAirGroup =
      bookingSource === "abidairtravel" && !isLocalGroup(groupId);
    const isNCTGroup = bookingSource === "NCT";
    const pricingData = {
      ...pricing,
      discountAmount: Number(pricing?.discountAmount || 0),
      originalGrandTotal:
        Number(pricing?.originalGrandTotal || 0) ||
        Number(pricing?.grandTotal || 0) + Number(pricing?.discountAmount || 0),
    };
    if (!pricingData.originalGrandTotal) {
      pricingData.originalGrandTotal = Number(pricingData.grandTotal || 0);
    }

    // 1️⃣ Deduct from local DB (existing logic)
    // This will throw an error if not enough seats available
    await adjustSeatsIfLocalGroup(groupId, -seatCount, true);

    // 2️⃣ Deduct from unified cache too
    await deductSeatsFromCache(groupId, seatCount);

    // 3️⃣ Create the booking
    booking = await Booking.create({
      groupId,
      groupType,
      airline,
      sector,
      pnr,
      contactPersonName,
      adultsCount,
      childrenCount,
      infantsCount,
      totalPassengers,
      pricing: pricingData,
      passengers,
      flights,
      departureDate,
      arrivalDate,
      userId: req.user._id,
      status: "on hold",
      expiresAt,
      source: bookingSource,
      sabaoonBookingStatus: isSabaoonGroup ? "pending" : "not_applicable",
      abidAirBookingStatus: isAbidAirGroup ? "pending" : "not_applicable",
    });

    // ─── Call Sabaoon booking API for external (Sabaoon) groups ───
    if (isSabaoonGroup && passengers.length > 0) {
      try {
        const { transactionId } = await createSabaoonBooking({
          groupId,
          pnr,
          bookingReference: booking.bookingReference,
          adultsCount,
          childrenCount,
          infantsCount,
          passengers,
          pricing,
        });

        const numericTransactionId = Number(transactionId);
        booking.sabaoonTransactionId = Number.isFinite(numericTransactionId)
          ? numericTransactionId
          : null;
        booking.sabaoonBookingStatus = "success";
        await booking.save();
        console.log(
          `Sabaoon booking created — transaction_id: ${transactionId}`,
        );
      } catch (sabaoonErr) {
        console.error("Sabaoon booking API failed:", sabaoonErr.message);
        booking.sabaoonBookingStatus = "failed";
        await booking.save();
        // We still return success to the user — local booking is saved.
        // The admin can retry / reconcile manually.
      }
    }

    // Call Abid Air booking API for external Abid Air groups/packages
    if (isAbidAirGroup && passengers.length > 0) {
      try {
        const abidAirRequest = buildAbidAirBookingRequest({
          reqBody: req.body,
          groupId,
          adultsCount,
          childrenCount,
          infantsCount,
          passengers,
          pricing,
        });

        const abidAirResp =
          abidAirRequest.type === "package"
            ? await createAbidAirPackageBooking(abidAirRequest.payload)
            : await createAbidAirFlightBooking(groupId, abidAirRequest.payload);

        booking.abidAirBookingType = abidAirRequest.type;
        booking.abidAirBookingStatus = abidAirResp?.success
          ? "success"
          : "failed";
        booking.abidAirBookingResponse = abidAirResp;
        booking.abidAirBookingId =
          abidAirResp?.package_booking_id?.toString?.() ||
          abidAirResp?.booking_id?.toString?.() ||
          null;
        booking.abidAirTicketId =
          abidAirResp?.ticket_id?.toString?.() ||
          abidAirResp?.ticketId?.toString?.() ||
          null;

        await booking.save();
        console.log("Abid Air booking created", {
          bookingReference: booking.bookingReference,
          type: abidAirRequest.type,
          response: abidAirResp,
        });
      } catch (abidAirErr) {
        console.error("Abid Air booking API failed:", abidAirErr.message);
        booking.abidAirBookingStatus = "failed";
        booking.abidAirBookingResponse =
          abidAirErr.response?.data || { error: abidAirErr.message };
        await booking.save();
      }
    }

    // Call Al-Haider booking API for external Al-Haider groups
    if (bookingSource === "al-haider" && passengers.length > 0) {
      try {
        // Map our booking to Al-Haider API format
        const alHaiderBooking = {
          group_id: groupId,
          agency_info: {
            group_id: groupId,
            agent_name: process.env.name,
            agency_name: process.env.name,
            email: process.env.email,
            mobile: process.env.mobile_no,
            adults: adultsCount,
            child: childrenCount,
            infant: infantsCount,
            agent_notes: null,
          },
          booking_details: (passengers || []).map((p) => ({
            type: p.type,
            surname: p.surname || p.surName || "",
            given_name: p.given_name || p.givenName || "",
            title: p.title.toUpperCase(),
            passport_no: p.passport_no || p.passportNo || p.passport || "",
            dob: p.dob || p.dateOfBirth || "",
            doe: p.doe || p.passportExpiry || "",
          })),
        };
        const alHaiderResp = await import("./al-haider.controller.js").then(
          (m) => m.createAlHaiderBooking(alHaiderBooking),
        );
        booking.alHaiderBookingStatus = alHaiderResp.success
          ? "success"
          : "failed";
        booking.alHaiderBookingResponse = alHaiderResp;
        await booking.save();
        console.log("Al-Haider booking created", alHaiderResp);
      } catch (alHaiderErr) {
        console.error("Al-Haider booking API failed:", alHaiderErr.message);
        booking.alHaiderBookingStatus = "failed";
        booking.alHaiderBookingResponse = { error: alHaiderErr.message };
        await booking.save();
      }
    }

    // ─── Call Travel Network booking API for external (Travel Network) groups ───
    if (isTravelNetworkGroup && passengers.length > 0) {
      try {
        const agencyGroupId = Number(process.env.id_travelnetwork?.trim());
        const tnPayload = {
          group_id: Number.isNaN(Number(groupId)) ? groupId : Number(groupId),
          agency_info: {
            group_id: Number.isNaN(agencyGroupId)
              ? process.env.id_travelnetwork?.trim() || ""
              : agencyGroupId,
            agent_name: process.env.name_travelnetwork?.trim() || "",
            agency_name: process.env.name_travelnetwork?.trim() || "",
            email: process.env.email_travelnetwork?.trim() || "",
            mobile: process.env.mobile_travelnetwork?.trim() || "",
            adults: Number(adultsCount) || 0,
            child: Number(childrenCount) || 0,
            infant: Number(infantsCount) || 0,
            agent_notes: null,
          },
          booking_details: (passengers || []).map((p) => {
            const type = String(p.type || "Adult");
            const normalizedType =
              type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
            const defaultTitleMap = {
              Adult: "MR",
              Child: "CHD",
              Infant: "INF",
            };

            return {
              type: normalizedType,
              surname: p.surname || p.surName || "",
              given_name: p.given_name || p.givenName || "",
              title: String(
                p.title || defaultTitleMap[normalizedType] || "MR",
              ).toUpperCase(),
              passport_no: p.passport_no || p.passportNo || p.passport || "",
              dob: toIsoDate(p.dob || p.dateOfBirth),
              doe: toIsoDate(p.doe || p.passportExpiry),
            };
          }),
          group_price_detail_id: resolvedGroupPriceDetailId,
        };

        console.log("Travel Network booking trigger:", {
          bookingReference: booking.bookingReference,
          source: bookingSource,
          groupId,
          group_price_detail_id: resolvedGroupPriceDetailId,
        });
        const tnResp = await createTravelNetworkBooking(tnPayload);
        console.log("Travel Network booking created", tnResp);
      } catch (tnErr) {
        console.error("Travel Network booking API failed:", tnErr.message);
      }
    }

    // ─── Handle NCT (Group Booking adapter) third-party API call ───
    if (isNCTGroup) {
      try {
        // Groups from this source are normalized as "nct_<productId>"
        const productId = String(groupId).replace(/^nct_/, "");

        const sealed =
          req.body.sealed ?? req.body._groupBooking?.sealed ?? null;

        const nctBookingData = formatBookingForNCT({
          productId,
          sealed,
          agencyCode: process.env.GROUP_BOOKING_AGENCY_CODE,
          agencyName: BOOKING_CONTACT.agencyName,
          bookStatus: "ON_HOLD",
          passengers: passengers.map((p) => ({
            type: p.type,
            title: p.title || "",
            givenName: p.givenName || "",
            surName: p.surName || p.surname || "",
            passport: p.passport || "",
            dateOfBirth: p.dateOfBirth || p.dob || "",
            passportExpiry: p.passportExpiry || p.expiry || p.doe || "",
            passportIssue: p.passportIssue || p.passportIssueDate || "",
            nationality: p.nationality || "Pakistan",
          })),
          pricing,
        });

        const nctResponse = await bookGroupNCT(nctBookingData);
        console.log(nctResponse);

        if (nctResponse) {
          const nctData = nctResponse.data || nctResponse;

          booking.nctBookingId =
            nctData?.bookingId || nctData?.id || nctData?.booking_id || null;

          if (nctData?.pnr) {
            booking.pnr = nctData.pnr;
          }

          booking.nctResponse = nctResponse;
          booking.nctBookingStatus = "success";

          await booking.save();
          console.log("✅ NCT booking saved successfully");
        }
      } catch (nctError) {
        console.error("❌ NCT API booking failed:", nctError.message);

        booking.nctBookingStatus = "failed";
        booking.nctErrorMessage = nctError.message;

        if (nctError.groupBookingResponseData) {
          booking.nctErrorDetails = nctError.groupBookingResponseData;
        }

        await booking.save();
        console.log("⚠️ NCT booking marked as failed but local booking kept");
      }
    }

    try {
      await sendBookingNotificationEmail({
        bookingType: "Ticket",
        booking,
        agent: req.user,
      });
    } catch (emailErr) {
      console.error(
        "sendBookingNotificationEmail failed:",
        emailErr?.message || emailErr,
      );
    }

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    // Rollback local DB seats if booking creation failed AFTER seat deduction
    if (seatCount > 0) {
      await adjustSeatsIfLocalGroup(
        normalizeGroupId(req.body.groupId),
        seatCount,
      ).catch(() => {});

      // Rollback cache seats too
      await deductSeatsFromCache(
        normalizeGroupId(req.body.groupId),
        -seatCount, // negative = add back
      ).catch(() => {});
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// -------------------------
// GET ALL BOOKINGS
// -------------------------
export const getAllBookings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sector,
      airline,
      fromDate,
      search,
    } = req.query;
    const query = {};

    if (status) query.status = status;
    if (sector) query.sector = sector;
    if (airline) query["airline.name"] = airline;
    if (fromDate) query.departureDate = { $gte: new Date(fromDate) };

    if (search) {
      query.$or = [
        { bookingReference: { $regex: search, $options: "i" } },
        { contactPersonName: { $regex: search, $options: "i" } },
        { pnr: { $regex: search, $options: "i" } },
      ];
    }

    if (req.user.role !== "Admin") query.userId = req.user._id;

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("userId", "name email agencyCode companyName phone address");

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalBookings: total,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bookings" });
  }
};

// -------------------------
// GET BOOKING BY ID
// -------------------------
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate(
      "userId",
      "name email agencyCode companyName phone address",
    );

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    if (
      req.user.role !== "Admin" &&
      booking.userId._id.toString() !== req.user._id.toString()
    )
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });

    res.json({ success: true, data: booking });
  } catch {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch booking" });
  }
};

// -------------------------
// GET BOOKING BY REFERENCE
// -------------------------
export const getBookingByReference = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      bookingReference: req.params.reference,
    }).populate("userId", "name email agencyCode companyName phone address");

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    if (
      req.user.role !== "Admin" &&
      booking.userId._id.toString() !== req.user._id.toString()
    )
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });

    res.json({ success: true, data: booking });
  } catch {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch booking" });
  }
};

// -------------------------
// UPDATE BOOKING STATUS
// -------------------------
export const updateBookingStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const booking = await Booking.findById(req.params.id).populate(
      "userId",
      "name email agencyCode companyName phone address",
    );
    if (!booking) throw new Error("Booking not found");

    const oldStatus = booking.status;
    const seats = booking.adultsCount + booking.childrenCount;

    // Ensure margin ledger entry is refreshed when booking is confirmed
    if (status === "confirmed") {
      const { recordBookingMarginLedger } =
        await import("./groupMargin.controller.js");
      const { default: Margin } = await import("../models/Margin.js");
      const latestMargin = await Margin.findOne({})
        .sort({ createdAt: -1 })
        .lean();
      await recordBookingMarginLedger({ booking, globalMargin: latestMargin });
    }

    if (status !== "confirmed") {
      await cleanupBookingMarginLedger({
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
      }).catch((ledgerErr) => {
        console.error(
          "updateBookingStatus ledger cleanup failed:",
          ledgerErr?.message || ledgerErr,
        );
      });
    }

    if (oldStatus !== "cancelled" && status === "cancelled") {
      await adjustSeatsIfLocalGroup(normalizeGroupId(booking.groupId), seats);
    }

    if (oldStatus === "cancelled" && status !== "cancelled") {
      await adjustSeatsIfLocalGroup(
        normalizeGroupId(booking.groupId),
        -seats,
        true,
      );
    }

    booking.status = status;
    booking.notes = notes ?? booking.notes;
    booking.expiresAt =
      status === "on hold" ? new Date(Date.now() + HOLD_DURATION) : null;

    await booking.save();

    if (oldStatus !== status) {
      try {
        await sendBookingStatusChangeEmail({
          bookingType: "Ticket",
          booking,
          agent: booking.userId,
          oldStatus,
          newStatus: status,
          changedBy: req.user?.name || req.user?.email || "System",
        });
      } catch (emailErr) {
        console.error(
          "sendBookingStatusChangeEmail failed:",
          emailErr?.message || emailErr,
        );
      }
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateBookingDiscount = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new Error("Booking not found");
    if (booking.status === "cancelled")
      throw new Error("Cannot update discount on cancelled booking");

    const discountAmount = Number(req.body.discountAmount || 0);
    if (Number.isNaN(discountAmount) || discountAmount < 0)
      throw new Error("Invalid discount amount");

    const existingDiscount = Number(booking.pricing?.discountAmount || 0);
    const originalGrandTotal =
      Number(booking.pricing?.originalGrandTotal || 0) ||
      Number(booking.pricing?.grandTotal || 0) + existingDiscount;

    booking.pricing.discountAmount = discountAmount;
    booking.pricing.originalGrandTotal = originalGrandTotal;
    booking.pricing.grandTotal = Math.max(
      0,
      originalGrandTotal - discountAmount,
    );

    await booking.save();

    if (booking.status === "confirmed") {
      const { recordBookingMarginLedger } =
        await import("./groupMargin.controller.js");
      const { default: Margin } = await import("../models/Margin.js");
      const latestMargin = await Margin.findOne({})
        .sort({ createdAt: -1 })
        .lean();
      await recordBookingMarginLedger({ booking, globalMargin: latestMargin });
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// -------------------------
// UPDATE BOOKING DETAILS
// -------------------------
export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "on hold")
      throw new Error("Only on-hold bookings can be edited");

    const oldSeats = booking.adultsCount + booking.childrenCount;

    // Update fields from body
    Object.assign(booking, req.body);

    // Normalize groupId if updated
    if (req.body.groupId) booking.groupId = normalizeGroupId(req.body.groupId);

    const newSeats = booking.adultsCount + booking.childrenCount;
    const diff = newSeats - oldSeats;

    if (diff > 0) {
      await adjustSeatsIfLocalGroup(booking.groupId, -diff, true);
    } else if (diff < 0) {
      await adjustSeatsIfLocalGroup(booking.groupId, Math.abs(diff));
    }

    booking.expiresAt =
      booking.status === "on hold"
        ? new Date(Date.now() + HOLD_DURATION)
        : null;

    await booking.save();

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// -------------------------
// CANCEL BOOKING
// -------------------------
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate(
      "userId",
      "name email agencyCode companyName phone address",
    );
    if (!booking) throw new Error("Booking not found");
    if (booking.status === "cancelled") throw new Error("Already cancelled");

    const oldStatus = booking.status;
    const seats = booking.adultsCount + booking.childrenCount;

    booking.status = "cancelled";
    booking.expiresAt = null;
    await booking.save();

    await adjustSeatsIfLocalGroup(booking.groupId, seats);
    await cleanupBookingMarginLedger({
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
    }).catch((ledgerErr) => {
      console.error(
        "cancelBooking ledger cleanup failed:",
        ledgerErr?.message || ledgerErr,
      );
    });

    try {
      await sendBookingStatusChangeEmail({
        bookingType: "Ticket",
        booking,
        agent: booking.userId,
        oldStatus,
        newStatus: "cancelled",
        changedBy: req.user?.name || req.user?.email || "System",
      });
    } catch (emailErr) {
      console.error(
        "sendBookingStatusChangeEmail failed:",
        emailErr?.message || emailErr,
      );
    }

    res.json({ success: true, message: "Booking cancelled", data: booking });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// -------------------------
// DELETE BOOKING (ADMIN ONLY)
// -------------------------
export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new Error("Booking not found");

    if (booking.status !== "cancelled") {
      const seats = booking.adultsCount + booking.childrenCount;
      await adjustSeatsIfLocalGroup(booking.groupId, seats);
    }

    await booking.deleteOne();
    await cleanupBookingMarginLedger({
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
    }).catch((ledgerErr) => {
      console.error(
        "deleteBooking ledger cleanup failed:",
        ledgerErr?.message || ledgerErr,
      );
    });

    res.json({ success: true, message: "Booking deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// -------------------------
// BOOKING STATISTICS (ADMIN DASHBOARD)
// -------------------------
export const getBookingStatistics = async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          revenue: { $sum: "$pricing.grandTotal" },
        },
      },
    ]);

    const totalBookings = await Booking.countDocuments();
    const totalRevenue = await Booking.aggregate([
      { $group: { _id: null, total: { $sum: "$pricing.grandTotal" } } },
    ]);

    res.json({
      success: true,
      data: {
        byStatus: stats,
        totalBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch statistics" });
  }
};

export const bulkTogglePriceOnCall = async (req, res) => {
  try {
    const { value } = req.body;

    if (typeof value !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Value must be boolean",
      });
    }

    const result = await Register.updateMany(
      {
        role: { $in: ["Agency"] },
      },
      {
        $set: { priceOnCall: value },
      },
    );

    return res.json({
      success: true,
      message: `Updated ${result.modifiedCount} agents`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to Bulk toggle price on call",
    });
  }
};

// -------------------------
// UPLOAD PASSENGER DOCUMENT
// -------------------------
export const uploadPassengerDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }
    // req.file.path is the Cloudinary secure URL
    res.json({ success: true, url: req.file.path });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
