import Airline from "../models/Airline.js";
import GroupTicketing from "../models/GroupTicketing.js";
import Sector from "../models/Sector.js";
import UnifiedGroupCache from "../models/UnifiedGroupCache.js";
import Booking from "../models/Booking.js";
import Margin from "../models/Margin.js";
import { fetchNormalisedAlHaiderGroups } from "./al-haider.controller.js";

const normalizeSector = (sector) => {
  if (!sector) return null;
  return sector.toUpperCase().replace(/\s+/g, "").replace(/–/g, "-").trim();
};

// Add new sector
export const addSector = async (req, res) => {
  try {
    const { groupType, sectorTitle, fullSector } = req.body;

    if (!groupType || !sectorTitle || !fullSector) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // ✅ Normalize karo save se pehle
    const normalizedTitle = normalizeSector(sectorTitle);

    // ✅ Check bhi normalized value se
    const existingSector = await Sector.findOne({
      groupType,
      sectorTitle: normalizedTitle,
    });

    if (existingSector) {
      return res.status(400).json({
        success: false,
        message: "Sector with this title already exists in this group",
      });
    }

    // ✅ Save bhi normalized value se
    const newSector = await Sector.create({
      groupType,
      sectorTitle: normalizedTitle,
      fullSector,
    });

    res.status(201).json({
      success: true,
      message: "Sector added successfully",
      data: newSector,
    });
  } catch (error) {
    console.error("Error adding sector:", error);
    res.status(500).json({
      success: false,
      message: "Error adding sector",
      error: error.message,
    });
  }
};
// Get all sectors
export const getSectors = async (req, res) => {
  try {
    const sectors = await Sector.find().sort({ groupType: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sectors.length,
      data: sectors,
    });
  } catch (error) {
    console.error("Error fetching sectors:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sectors",
      error: error.message,
    });
  }
};

// Get sectors by group type
export const getSectorsByGroup = async (req, res) => {
  try {
    const { groupType } = req.params;
    const sectors = await Sector.find({ groupType }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sectors.length,
      data: sectors,
    });
  } catch (error) {
    console.error("Error fetching sectors by group:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sectors by group",
      error: error.message,
    });
  }
};

// Get single sector by ID
export const getSectorById = async (req, res) => {
  try {
    const { id } = req.params;
    const sector = await Sector.findById(id);

    if (!sector) {
      return res.status(404).json({
        success: false,
        message: "Sector not found",
      });
    }

    res.status(200).json({
      success: true,
      data: sector,
    });
  } catch (error) {
    console.error("Error fetching sector:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sector",
      error: error.message,
    });
  }
};

// Update sector
export const updateSector = async (req, res) => {
  try {
    const { id } = req.params;
    const { groupType, sectorTitle, fullSector } = req.body;

    // Validate required fields
    if (!groupType || !sectorTitle || !fullSector) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check if sector exists
    const sector = await Sector.findById(id);
    if (!sector) {
      return res.status(404).json({
        success: false,
        message: "Sector not found",
      });
    }

    // Check if another sector with the same title exists in the same group
    const existingSector = await Sector.findOne({
      _id: { $ne: id },
      groupType,
      sectorTitle: sectorTitle.toUpperCase(),
    });

    if (existingSector) {
      return res.status(400).json({
        success: false,
        message: "Another sector with this title already exists in this group",
      });
    }

    // Update sector
    const updatedSector = await Sector.findByIdAndUpdate(
      id,
      {
        groupType,
        sectorTitle: sectorTitle.toUpperCase(),
        fullSector,
      },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Sector updated successfully",
      data: updatedSector,
    });
  } catch (error) {
    console.error("Error updating sector:", error);
    res.status(500).json({
      success: false,
      message: "Error updating sector",
      error: error.message,
    });
  }
};

// Delete sector
export const deleteSector = async (req, res) => {
  try {
    const { id } = req.params;

    const sector = await Sector.findById(id);
    if (!sector) {
      return res.status(404).json({
        success: false,
        message: "Sector not found",
      });
    }

    await Sector.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Sector deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting sector:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting sector",
      error: error.message,
    });
  }
};

// Update Sector Order
export const updateSectorOrder = async (req, res) => {
  try {
    const { sectors } = req.body;

    if (!sectors || !Array.isArray(sectors)) {
      return res
        .status(400)
        .json({ success: false, message: "Sectors array is required" });
    }

    // Prepare bulk operations
    const bulkOps = sectors.map((sector) => ({
      updateOne: {
        filter: { _id: sector._id },
        update: { $set: { order: sector.order } },
      },
    }));

    await Sector.bulkWrite(bulkOps);

    const updatedSectors = await Sector.find().sort({ order: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      message: "Sector order updated successfully",
      data: updatedSectors,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const makeGroupKey = (g) => {
  return [
    g.source,
    g.sector,
    g.airline?.short_name || g.airline?.airline_name,
    g.dept_date,
    g.price,
  ].join("|");
};

// const normalizeSector = (sector) => {
//   if (!sector) return null;

//   return sector
//     .toUpperCase()
//     .replace(/\s+/g, "") // remove spaces
//     .replace(/–/g, "-")
//     .trim();
// };

export const getUnifiedGroups = async (req, res) => {

  try {
    /* ===============================
       1️⃣ Fetch Admin Groups
    =============================== */
    const adminGroups = await GroupTicketing.find({ internalStatus: "Public" })
      .sort({ createdAt: -1 })
      .lean();

    /* ===============================
       2️⃣ Fetch Airlines
    =============================== */
    const airlines = await Airline.find().lean();

    /* ===============================
       3️⃣ Fetch Sector Sorting Order
    =============================== */
    const sectors = await Sector.find().lean();

    // Make sector order map
    const sectorOrderMap = {};
    sectors.forEach((s) => {
      sectorOrderMap[normalizeSector(s.sectorTitle)] = s.order ?? 999;
    });

    /* 5️⃣ Fetch bookings for all admin groups (include cancelled for reference) */
    const groupIds = adminGroups.map(g => g._id.toString());
    const bookings = await Booking.find({ groupId: { $in: groupIds }, status: { $in: ["on hold", "confirmed"] } }).lean();

    // Build a map: groupId -> total on-hold/confirmed passengers for the entire group
    const totalHeldSeatsMap = {};
    for (const booking of bookings) {
      const gid = booking.groupId;
      const seatsHeld = booking.adultsCount + booking.childrenCount;
      totalHeldSeatsMap[gid] = (totalHeldSeatsMap[gid] || 0) + seatsHeld;
    }

    // Also track booking count per group for admin visibility
    const bookingCountMap = {};
    for (const booking of bookings) {
      const gid = booking.groupId;
      bookingCountMap[gid] = (bookingCountMap[gid] || 0) + 1;
    }

    // Build a map: groupId -> { flightKey: total booked passengers }
    // flightKey = flightNo + '|' + depDate (ISO string)
    const bookedMap = {};
    for (const booking of bookings) {
      const gid = booking.groupId;
      if (!bookedMap[gid]) bookedMap[gid] = {};
      if (Array.isArray(booking.flights)) {
        for (const flight of booking.flights) {
          const flightNo = flight.flightNo;
          const depDate = (flight.depDate || flight.flightDate);
          if (!flightNo || !depDate) continue;
          const depDateStr = new Date(depDate).toISOString().split('T')[0];
          const key = flightNo + '|' + depDateStr;
          bookedMap[gid][key] = (bookedMap[gid][key] || 0) + (booking.adultsCount + booking.childrenCount || 0);
        }
      }
    }

    console.log(`[GET UNIFIED GROUPS] Fetched ${adminGroups.length} admin groups, ${bookings.length} active bookings`);
    for (const [gid, seats] of Object.entries(totalHeldSeatsMap)) {
      console.log(`  GroupID: ${gid}, On-Hold Seats: ${seats}, Bookings: ${bookingCountMap[gid]}`);
    }

    /* 4️⃣ Transform Admin Groups → Unified (with bookedSeats per flight) */
    const transformedAdmin = adminGroups.map((g) => {
      const airline = airlines.find((a) => a.airlineName === g.airline);
      const gidString = g._id.toString();
      
      // Prepare details with bookedSeats per flight
      const details = g.flights?.map((f, i) => {
        const flightNo = f.flightNo;
        const depDate = f.depDate;
        const depDateStr = depDate ? new Date(depDate).toISOString().split('T')[0] : '';
        const key = flightNo + '|' + depDateStr;
        const bookedSeats = bookedMap[gidString]?.[key] || 0;
        return {
          sr: i + 1,
          flight_no: flightNo,
          dep_date: depDate,
          dept_time: f.depTime,
          origin: f.fromTerminal,
          destination: f.toTerminal,
          arv_date: f.arrDate,
          arv_time: f.arrTime,
          baggage: f.baggage,
          meal: f.meal,
          bookedSeats,
        };
      }) || [];

      // For backward compatibility, sum all bookedSeats for this group (all flights)
      const totalBooked = details.reduce((sum, d) => sum + (d.bookedSeats || 0), 0);

      // ⭐ Key: totalSeats is ALREADY deducted in DB when booking is on hold
      // So available_no_of_pax = g.totalSeats (remaining after all on-hold/confirmed bookings)
      const availableSeats = g.totalSeats;
      const totalOnHoldSeats = totalHeldSeatsMap[gidString] || 0;
      
      // Original seats can be calculated if needed
      const originalSeats = availableSeats + totalOnHoldSeats;

      return {
        id: g._id,
        source: "admin",
        isOwnGroup: true,

        sector: normalizeSector(g.sector),
        sectorKey: normalizeSector(g.sector), // for sorting only
        type: g.groupType,

        // Available seats after on-hold deductions
        available_no_of_pax: availableSeats,
        // Show seat field
        showSeat: g.showSeat,
        // Metadata for admin dashboard
        _totalOriginalSeats: originalSeats,
        _onHoldSeats: totalOnHoldSeats,
        _activeBookings: bookingCountMap[gidString] || 0,

        price: g.price?.sellingAdultPriceB2B || 0,
        childPrice: g.price?.sellingChildPriceB2B || 0,
        infantPrice: g.price?.sellingInfantPriceB2B || 0,

        pnr: g.pnr,

        dept_date: g.flights?.[0]?.depDate || null,
        arv_date: g.flights?.[g.flights.length - 1]?.arrDate || null,

        details,

        airline: {
          id: airline?._id || null,
          airline_name: g.airline,
          short_name: airline?.shortCode || null,
          logo_url: airline?.logo || null,
        },
        bookedSeats: totalBooked,
      };
    });

    /* ===============================
       6️⃣ Merge & Fix Dates
    =============================== */
    let unifiedGroups = [...transformedAdmin];

    unifiedGroups = unifiedGroups.map((g) => {
      const formatDate = (dateValue) => {
        if (!dateValue) return null;
        const d = new Date(dateValue);
        return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
      };

      const finalDeptDate = formatDate(g.dept_date || g.dep_date);
      const finalArvDate = formatDate(g.arv_date);

      return {
        ...g,
        id: g.id?.toString?.() || g.id,
        dept_date: finalDeptDate,
        arv_date: finalArvDate,

        details: g.details?.map((d) => {
          const detailDepDate = formatDate(
            d.dep_date || d.flight_date || finalDeptDate,
          );

          // 2. Fix arrival date logic
          const detailArvDate = formatDate(d.arv_date);

          return {
            ...d,
            // Ensure field names are consistent
            dep_date: detailDepDate,
            flight_date: detailDepDate,
            arv_date: detailArvDate,
          };
        }),

        airline: {
          ...g.airline,
          id: g.airline?.id?.toString?.() || g.airline?.id,
        },
      };
    });

    /* ===============================
       8️⃣ Sector Sorting (ADMIN ORDER)
    =============================== */
    unifiedGroups.sort((a, b) => {
      const orderA = sectorOrderMap[normalizeSector(a.sector)] ?? 999;
      const orderB = sectorOrderMap[normalizeSector(b.sector)] ?? 999;
      return orderA - orderB;
    });

    /* ===============================
       9️⃣ Filter — Past Departures Remove
    =============================== */
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const freshGroups = unifiedGroups.filter((group) => {
      const rawDate = group.dept_date;
      if (!rawDate) return true; // no date = keep it

      const depDate = new Date(rawDate);
      depDate.setHours(0, 0, 0, 0);

      return depDate >= today; // ✅ today or future only
    });

    /* ===============================
       🔟 Smart Cache Store / Update
    =============================== */
    let cacheDoc = await UnifiedGroupCache.findOne();

    if (!cacheDoc) {
      // First time — create fresh
      cacheDoc = await UnifiedGroupCache.create({
        data: freshGroups,
        apidata: true,
      });
    } else {
      // Smart merge: preserve cache seat counts for groups
      // that were recently booked (within last HOLD_DURATION window)
      const HOLD_DURATION_MS = 15 * 60 * 1000; // match your HOLD_DURATION constant
      const recentCutoff = new Date(Date.now() - HOLD_DURATION_MS);

      // Find groups that have active/recent bookings
      const recentlyBookedGroupIds = await Booking.distinct("groupId", {
        createdAt: { $gte: recentCutoff },
        status: { $in: ["on hold", "confirmed"] },
      });

      const recentlyBookedSet = new Set(recentlyBookedGroupIds.map(String));

      // Build map from existing cache for quick lookup
      // const cachedDataMap = new Map(
      //   cacheDoc.data.map((g) => [String(g.id), g]),
      // );

      const cachedDataMap = new Map(
        cacheDoc.data.map((g) => [makeGroupKey(g), g]),
      );

      // Merge: protect seat count if group was recently booked
      const mergedGroups = freshGroups.map((freshGroup) => {
        // const gId = String(freshGroup.id);
        const gKey = makeGroupKey(freshGroup);

        // if (recentlyBookedSet.has(gId)) {
        //   // 🔒 Keep cached seat count — already deducted by createBooking
        //   const cached = cachedDataMap.get(gId);

        if (recentlyBookedSet.has(String(freshGroup.id))) {
          const cached = cachedDataMap.get(gKey);
          if (cached) {
            return {
              ...freshGroup,
              available_no_of_pax: cached.available_no_of_pax,
            };
          }
        }

        // ✅ No recent booking = use fresh API/DB data
        return freshGroup;
      });

      cacheDoc.data = mergedGroups;
      cacheDoc.apidata = true;
      cacheDoc.markModified("data"); // required for Mongoose mixed arrays
      await cacheDoc.save();
    }

    /* ===============================
       1️⃣1️⃣ Fetch Al-Haider Groups (live, not cached)
    =============================== */
    let alHaiderGroups = [];
    try {
      const rawAlHaider = await fetchNormalisedAlHaiderGroups();

      const airlineShortMap = {};
      for (const a of airlines) {
        if (a.airlineName) airlineShortMap[a.airlineName.trim()] = a.shortCode || null;
      }

      alHaiderGroups = rawAlHaider
        .map((g) => {
          const airlineName = g.airline?.airline_name || "";
          return {
            ...g,
            source: "al-haider",
            isOwnGroup: false,
            airline: g.airline
              ? {
                  ...g.airline,
                  short_name:
                    airlineShortMap[airlineName] ||
                    g.airline.short_name ||
                    null,
                }
              : g.airline,
          };
        });
      // Sabaoon and other API feeds are intentionally disabled here.
      // All Groups should now use local admin groups plus Al-Haider groups only.
    } catch (alHaiderErr) {
      // Non-fatal — admin groups are still returned
      console.error(
        "Al-Haider fetch for unified groups failed:",
        alHaiderErr.message,
      );
    }

    /* ===============================
       1️⃣2️⃣ Response
    =============================== */
    const adminGroupsData = cacheDoc.data.map((g) => ({ ...g, isOwnGroup: true }));
     const combinedData = [...adminGroupsData, ...alHaiderGroups];

    // Apply sector order to the full combined dataset (admin + sabaoon)
    combinedData.sort((a, b) => {
      const orderA = sectorOrderMap[normalizeSector(a.sector)] ?? 999;
      const orderB = sectorOrderMap[normalizeSector(b.sector)] ?? 999;
      return orderA - orderB;
    });

    res.status(200).json({
      success: true,
      total: combinedData.length,
      data: combinedData,
    });
  } catch (error) {
    console.error("Unified API Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Apply Margin to all public groups
export const applyMargin = async (req, res) => {
  try {
    const { value, type } = req.body;

    // Validate inputs
    if (!value && value !== 0 || !type || !["percent", "amount"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid input. Provide value and type (percent or amount)",
      });
    }

    const marginValue = parseFloat(value);

    if (isNaN(marginValue) || marginValue < 0) {
      return res.status(400).json({
        success: false,
        message: "Margin value must be a positive number",
      });
    }

    /* ===============================
       Save margin to database
    =============================== */
    let marginDoc = await Margin.findOne();

    if (marginDoc) {
      // Update existing margin
      marginDoc.value = marginValue;
      marginDoc.type = type;
      marginDoc.appliedAt = new Date();
      await marginDoc.save();
    } else {
      // Create new margin
      marginDoc = await Margin.create({
        value: marginValue,
        type: type,
        appliedAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: `Margin saved successfully: ${marginValue} ${type === "percent" ? "%" : "Rs"}`,
      data: {
        value: marginDoc.value,
        type: marginDoc.type,
        appliedAt: marginDoc.appliedAt,
      },
    });
  } catch (error) {
    console.error("Error saving margin:", error);
    res.status(500).json({
      success: false,
      message: "Error saving margin",
      error: error.message,
    });
  }
};

// Get current margin
export const getMargin = async (req, res) => {
  try {
    const marginDoc = await Margin.findOne();

    if (!marginDoc) {
      return res.status(200).json({
        success: true,
        message: "No margin set",
        data: {
          value: 0,
          type: "percent",
          appliedAt: null,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        value: marginDoc.value,
        type: marginDoc.type,
        appliedAt: marginDoc.appliedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching margin:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching margin",
      error: error.message,
    });
  }
};
