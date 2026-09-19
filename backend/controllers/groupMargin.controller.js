import GroupMarginOverride from "../models/GroupMarginOverride.js";
import MarginLedger from "../models/MarginLedger.js";
import Booking from "../models/Booking.js";
import Margin from "../models/Margin.js";

const TYPE_TO_CATEGORY = {
  "UAE ONE WAY GROUP": "uae",
  "ONE WAY GROUP": "ksa",
  "OMAN ONE WAY GROUP": "muscat",
  "UMRAH GROUP": "umrah-tickets",
  "UMRAH GROUPS": "umrah-packages",
  "UK ONE WAY GROUP": "uk",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
const makeKey = (source, groupId) => `${source}-${groupId}`;

const getCategoryFromGroupType = (groupType = "") => {
  const normalized = String(groupType).toUpperCase().trim();
  return TYPE_TO_CATEGORY[normalized] || "";
};

// ─────────────────────────────────────────────────────────────────────────────
// SET (upsert) a per-group margin override + write a ledger entry
// ─────────────────────────────────────────────────────────────────────────────
export const setGroupMargin = async (req, res) => {
  try {
    const { groupId, source, sector, flightNo, deptDate, basePrice, marginAmount, note } =
      req.body;

    if (!groupId || !source || marginAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: "groupId, source and marginAmount are required",
      });
    }

    const parsed = parseFloat(marginAmount);
    if (isNaN(parsed) || parsed < 0) {
      return res.status(400).json({ success: false, message: "marginAmount must be >= 0" });
    }

    const overrideKey = makeKey(source, groupId);

    // Upsert override record
    const override = await GroupMarginOverride.findOneAndUpdate(
      { overrideKey },
      {
        overrideKey,
        groupId,
        source,
        sector: sector || "",
        flightNo: flightNo || "",
        marginAmount: parsed,
        note: note || "",
        appliedBy: req.user?.name || "admin",
      },
      { upsert: true, new: true }
    );

    // Create margin-applied ledger entry
    await MarginLedger.create({
      entryType: "margin_applied",
      groupId,
      source: source || "",
      sector: sector || "",
      flightNo: flightNo || "",
      deptDate: deptDate ? new Date(deptDate) : null,
      basePrice: parseFloat(basePrice) || 0,
      marginAmount: parsed,
      note: note || "",
      appliedBy: req.user?.name || "admin",
    });

    return res.status(200).json({
      success: true,
      message: "Group margin saved and ledger entry created",
      data: override,
    });
  } catch (err) {
    console.error("setGroupMargin error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET all active overrides  (returns a map: overrideKey → marginAmount)
// ─────────────────────────────────────────────────────────────────────────────
export const getGroupMargins = async (req, res) => {
  try {
    const overrides = await GroupMarginOverride.find({}).lean();

    // Build lookup map for quick frontend consumption
    const map = {};
    overrides.forEach((o) => {
      map[o.overrideKey] = {
        marginAmount: o.marginAmount,
        note: o.note,
        updatedAt: o.updatedAt,
      };
    });

    return res.status(200).json({ success: true, data: map });
  } catch (err) {
    console.error("getGroupMargins error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CLEAR (delete) a per-group override
// ─────────────────────────────────────────────────────────────────────────────
export const clearGroupMargin = async (req, res) => {
  try {
    const { source, groupId } = req.params;
    const overrideKey = makeKey(source, groupId);

    await GroupMarginOverride.deleteOne({ overrideKey });

    return res.status(200).json({ success: true, message: "Override cleared" });
  } catch (err) {
    console.error("clearGroupMargin error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET margin ledger entries  (supports optional dateFrom / dateTo filters)
// ─────────────────────────────────────────────────────────────────────────────
export const getMarginLedger = async (req, res) => {
  try {
    const { dateFrom, dateTo, entryType } = req.query;

    const filter = {};

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (entryType) filter.entryType = entryType;

    const entries = await MarginLedger.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: entries });
  } catch (err) {
    console.error("getMarginLedger error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// BACKFILL: create missing booking_confirmed ledger rows for confirmed bookings
// Query params:
//   - dateFrom, dateTo (optional)
//   - userId (optional)
//   - limit (optional, max 5000)
//   - dryRun=true (optional: no writes, only counts)
// ─────────────────────────────────────────────────────────────────────────────
export const backfillConfirmedBookingLedgers = async (req, res) => {
  try {
    const { dateFrom, dateTo, userId, limit, dryRun } = req.query;

    const bookingFilter = { status: "confirmed" };

    if (userId) bookingFilter.userId = userId;

    if (dateFrom || dateTo) {
      bookingFilter.createdAt = {};
      if (dateFrom) bookingFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        bookingFilter.createdAt.$lte = end;
      }
    }

    let query = Booking.find(bookingFilter).sort({ createdAt: 1 });

    const parsedLimit = Number.parseInt(String(limit || "0"), 10);
    if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
      query = query.limit(Math.min(parsedLimit, 5000));
    }

    const confirmedBookings = await query.lean();

    if (!confirmedBookings.length) {
      return res.status(200).json({
        success: true,
        message: "No confirmed bookings found for the selected filter",
        data: { scanned: 0, alreadyPresent: 0, missing: 0, created: 0 },
      });
    }

    const bookingIds = confirmedBookings.map((b) => b._id);

    const existingEntries = await MarginLedger.find({
      entryType: "booking_confirmed",
      bookingId: { $in: bookingIds },
    })
      .select("bookingId")
      .lean();

    const existingSet = new Set(
      existingEntries.map((e) => String(e.bookingId))
    );

    const missingBookings = confirmedBookings.filter(
      (b) => !existingSet.has(String(b._id))
    );

    const isDryRun = String(dryRun || "false").toLowerCase() === "true";

    if (isDryRun) {
      return res.status(200).json({
        success: true,
        message: "Dry run completed",
        data: {
          scanned: confirmedBookings.length,
          alreadyPresent: existingEntries.length,
          missing: missingBookings.length,
          created: 0,
        },
      });
    }

    const latestMargin = await Margin.findOne({}).sort({ createdAt: -1 }).lean();

    let created = 0;
    const failed = [];

    for (const booking of missingBookings) {
      try {
        await recordBookingMarginLedger({ booking, globalMargin: latestMargin });

        const existsNow = await MarginLedger.exists({
          entryType: "booking_confirmed",
          bookingId: booking._id,
        });

        if (existsNow) {
          created += 1;
        } else {
          failed.push({
            bookingId: String(booking._id),
            bookingReference: booking.bookingReference || "",
            reason: "Ledger row was not created",
          });
        }
      } catch (err) {
        failed.push({
          bookingId: String(booking._id),
          bookingReference: booking.bookingReference || "",
          reason: err?.message || "Unknown error",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Backfill completed",
      data: {
        scanned: confirmedBookings.length,
        alreadyPresent: existingEntries.length,
        missing: missingBookings.length,
        created,
        failed,
      },
    });
  } catch (err) {
    console.error("backfillConfirmedBookingLedgers error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper — called from booking controller on confirmation
// ─────────────────────────────────────────────────────────────────────────────
export const recordBookingMarginLedger = async ({
  booking,
  globalMargin,
}) => {
  try {
    const fallbackGroupId = String(
      booking.groupId ||
      booking.package ||
      booking.packageData?._id ||
      booking.packageData?.id ||
      booking.bookingReference ||
      booking.bookingNumber ||
      booking._id ||
      "umrah"
    );

    const bookingSource = String(booking.source || "").toLowerCase().trim();
    const bookingGroupType = String(booking.groupType || "").trim();
    const normalizedSector = String(booking.sector || "").toUpperCase().trim();
    const category = getCategoryFromGroupType(bookingGroupType);

    // Priority: category override -> sector override -> source/group override -> legacy groupType/group override
    const candidateKeys = [];
    if (category) candidateKeys.push(makeKey("group-category", category));
    if (normalizedSector) candidateKeys.push(makeKey("sector", `sector:${normalizedSector}`));
    if (bookingSource && fallbackGroupId) candidateKeys.push(makeKey(bookingSource, fallbackGroupId));
    if (bookingGroupType && fallbackGroupId)
      candidateKeys.push(makeKey(bookingGroupType, fallbackGroupId));

    let override = null;
    for (const key of candidateKeys) {
      override = await GroupMarginOverride.findOne({ overrideKey: key }).lean();
      if (override) break;
    }

    const basePrice =
      Number(booking.pricing?.adultBasePrice || booking.pricing?.adultPrice || booking.pricing?.pricePerPerson || 0);
    const totalFare = Number(
      booking.pricing?.grandTotal || booking.pricing?.totalAmount || booking.pricing?.pricePerPerson || 0,
    );
    let marginAmount = 0;
    const bookingReference =
      booking.bookingReference || booking.bookingNumber || booking.reference || "";
    const rawUserId = booking.userId || booking.user || null;
    const userId = rawUserId?._id || rawUserId || null;

    // Margin locked at booking time from the provider/sector/flight rules is
    // authoritative; the legacy override/global lookup only covers bookings
    // that carry no snapshot (old bookings, or groups with no rules).
    const snapshot = booking.marginSnapshot;
    const snapshotMargin = Number(snapshot?.perPax || 0);

    if (snapshotMargin > 0) {
      marginAmount = snapshotMargin;
    } else if (override && override.marginAmount > 0) {
      marginAmount = override.marginAmount;
    } else if (globalMargin) {
      marginAmount =
        globalMargin.type === "percent"
          ? Math.round((basePrice * globalMargin.value) / 100)
          : globalMargin.value;
    }

    const pax = (booking.adultsCount || 0) + (booking.childrenCount || 0);
    // Rule margins are added to adult and child fares only, and only when that
    // fare is priced (an "on call"/0 fare carries no margin).
    const marginPax =
      snapshotMargin > 0
        ? (Number(booking.pricing?.adultPrice) > 0 ? booking.adultsCount || 0 : 0) +
          (Number(booking.pricing?.childPrice) > 0 ? booking.childrenCount || 0 : 0)
        : pax;
    const totalMarginEarned = marginAmount * marginPax;

    const existingEntries = await MarginLedger.find({
      entryType: "booking_confirmed",
      bookingId: booking._id,
    }).lean();

    const ledgerPayload = {
      entryType: "booking_confirmed",
      groupId: fallbackGroupId,
      source: bookingSource || bookingGroupType || "",
      sector: booking.sector || "",
      flightNo: booking.flights?.[0]?.flightNo || "",
      deptDate: booking.departureDate || null,
      basePrice,
      marginAmount,
      providerMargin: snapshotMargin > 0 ? Number(snapshot.provider || 0) : 0,
      sectorMargin: snapshotMargin > 0 ? Number(snapshot.sector || 0) : 0,
      flightMargin: snapshotMargin > 0 ? Number(snapshot.flight || 0) : 0,
      bookingId: booking._id,
      bookingReference,
      passengers: marginPax,
      totalMarginEarned,
      discountAmount: Number(booking.pricing?.discountAmount || 0),
      totalFare,
      note: `Booking confirmed: ${bookingReference || booking._id}`,
      userId,
      appliedBy: "system",
    };

    if (existingEntries.length > 0) {
      await MarginLedger.updateMany(
        { entryType: "booking_confirmed", bookingId: booking._id },
        ledgerPayload,
        { runValidators: true },
      );
    } else {
      await MarginLedger.create(ledgerPayload);
    }
  } catch (err) {
    // Non-fatal: just log — don't block booking confirmation
    console.error("recordBookingMarginLedger error:", err);
  }
};
