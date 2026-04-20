import Airline from "../models/Airline.js";
import GroupTicketing from "../models/GroupTicketing.js";
import Sector from "../models/Sector.js";
import UnifiedGroupCache from "../models/UnifiedGroupCache.js";
import Booking from "../models/Booking.js";
import Margin from "../models/Margin.js";
import SabaoonGroupOverride from "../models/SabaoonGroupOverride.js";
import { fetchNormalisedSabaoonGroups } from "./sabaoon.controller.js";

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
    /* ===============================
       4️⃣ Transform Admin Groups → Unified
    =============================== */
    const transformedAdmin = adminGroups.map((g) => {
      const airline = airlines.find((a) => a.airlineName === g.airline);

      return {
        id: g._id,
        source: "admin",
        isOwnGroup: true,

        sector: normalizeSector(g.sector),
        sectorKey: normalizeSector(g.sector), // for sorting only
        type: g.groupType,

        available_no_of_pax: g.totalSeats,
        showSeat: g.showSeat,

        price: g.price?.sellingAdultPriceB2B || 0,
        childPrice: g.price?.sellingChildPriceB2B || 0,
        infantPrice: g.price?.sellingInfantPriceB2B || 0,

        pnr: g.pnr,

        dept_date: g.flights?.[0]?.depDate || null,
        arv_date: g.flights?.[g.flights.length - 1]?.arrDate || null,

        details: g.flights?.map((f, i) => ({
          sr: i + 1,
          flight_no: f.flightNo,
          dep_date: f.depDate,
          dept_time: f.depTime,
          origin: f.fromTerminal,
          destination: f.toTerminal,
          arv_date: f.arrDate,
          arv_time: f.arrTime,
          baggage: f.baggage,
          meal: f.meal,
        })),

        airline: {
          id: airline?._id || null,
          airline_name: g.airline,
          short_name: airline?.shortCode || null,
          logo_url: airline?.logo || null,
        },
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
       1️⃣1️⃣ Fetch Sabaoon Groups (live, not cached)
    =============================== */
    let sabaoonGroups = [];
    try {
      const rawSabaoon = await fetchNormalisedSabaoonGroups();

      // Load overrides for individualMargin + hidden flag
      const overrides = await SabaoonGroupOverride.find({}).lean();
      const overrideMap = Object.fromEntries(
        overrides.map((o) => [String(o.groupId), o]),
      );

      // Build airline name → shortCode map from our DB airlines
      const airlineShortMap = {};
      for (const a of airlines) {
        if (a.airlineName) airlineShortMap[a.airlineName.trim()] = a.shortCode || null;
      }

      // Filter hidden groups, attach individualMargin + short_name
      sabaoonGroups = rawSabaoon
        .filter((g) => !overrideMap[String(g.id)]?.isHidden)
        .map((g) => {
          const override = overrideMap[String(g.id)];
          const airlineName = g.airline?.airline_name || "";
          return {
            ...g,
            source: "sabaoon",
            isOwnGroup: false,
            individualMargin: override?.individualMargin ?? null,
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
    } catch (sabaoonErr) {
      // Non-fatal — admin groups are still returned
      console.error(
        "Sabaoon fetch for unified groups failed:",
        sabaoonErr.message,
      );
    }

    /* ===============================
       1️⃣2️⃣ Response
    =============================== */
    const adminGroupsData = cacheDoc.data.map((g) => ({ ...g, isOwnGroup: true }));
    const combinedData = [...adminGroupsData, ...sabaoonGroups];

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
