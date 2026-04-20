import axios from "axios";
import FormData from "form-data";
import { getValidSabaoonToken } from "../utils/sabaoonToken.js";
import SabaoonGroupOverride from "../models/SabaoonGroupOverride.js";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/** Format a Date (or date string) to "YYYY-MM-DD". Returns "" if invalid. */
const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

// ─────────────────────────────────────────────────────────
// SHARED HELPER
// ─────────────────────────────────────────────────────────

/**
 * Fetches and normalises all available Sabaoon groups from the external API.
 * Throws on token or network failure.
 */
export const fetchNormalisedSabaoonGroups = async (type) => {
  let tokenRecord;
  try {
    tokenRecord = await getValidSabaoonToken();
  } catch (refreshErr) {
    console.error("Failed to obtain a valid Sabaoon token:", refreshErr.message);
    throw new Error("Unable to authenticate with Sabaoon. Please try again later.");
  }

  const params = { token: tokenRecord.token };
  if (type) params.type = type;

  const response = await axios.get(`${process.env.SABAOON_API_URL}/groups`, { params });
  const rawGroups = response.data?.groups || [];
  const LOGO_BASE = "https://sabaoon.com/assets/img/airline-logo/";

  return rawGroups
    .filter((g) => Number(g.available_no_of_pax) > 0)
    .map((g) => {
      const firstDetail = g.details?.[0] || {};
      const airlineObj = Array.isArray(g.airline) ? g.airline[0] : g.airline;

      const logoUrl = airlineObj?.logo_url
        ? airlineObj.logo_url.startsWith("http")
          ? airlineObj.logo_url
          : `${LOGO_BASE}${encodeURIComponent(airlineObj.logo_url)}`
        : null;

      return {
        ...g,
        price: Number(g.price) || 0,
        sector:
          firstDetail.origin && firstDetail.destination
            ? `${firstDetail.origin}-${firstDetail.destination}`
            : g.sector,
        airline: airlineObj ? { ...airlineObj, logo_url: logoUrl } : null,
        details: (g.details || []).map((d) => ({ ...d, meal: g.meal })),
      };
    });
};

// ─────────────────────────────────────────────────────────
// GET ALL GROUPS (public / frontend)
// ─────────────────────────────────────────────────────────

export const getSabaoonGroups = async (req, res) => {
  try {
    const groups = await fetchNormalisedSabaoonGroups(req.query.type);

    // Load admin overrides and build a lookup map
    const overrides = await SabaoonGroupOverride.find({}).lean();
    const overrideMap = Object.fromEntries(overrides.map((o) => [String(o.groupId), o]));

    // Filter out hidden groups; attach individualMargin when set
    const publicGroups = groups
      .filter((g) => !overrideMap[String(g.id)]?.isHidden)
      .map((g) => {
        const override = overrideMap[String(g.id)];
        return { ...g, individualMargin: override?.individualMargin ?? null };
      });

    return res.json({ success: true, data: publicGroups });
  } catch (error) {
    console.error("Error fetching Sabaoon groups:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to fetch groups from Sabaoon" });
  }
};

// ─────────────────────────────────────────────────────────
// GET ALL GROUPS (admin — includes hidden + override data)
// ─────────────────────────────────────────────────────────

export const getAdminSabaoonGroups = async (req, res) => {
  try {
    const groups = await fetchNormalisedSabaoonGroups(req.query.type);

    const overrides = await SabaoonGroupOverride.find({}).lean();
    const overrideMap = Object.fromEntries(overrides.map((o) => [String(o.groupId), o]));

    const adminGroups = groups.map((g) => {
      const override = overrideMap[String(g.id)];
      return {
        ...g,
        isHidden: override?.isHidden ?? false,
        individualMargin: override?.individualMargin ?? null,
      };
    });

    return res.json({ success: true, data: adminGroups });
  } catch (error) {
    console.error("Error fetching admin Sabaoon groups:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to fetch groups from Sabaoon" });
  }
};

// ─────────────────────────────────────────────────────────
// UPSERT GROUP OVERRIDE (admin)
// ─────────────────────────────────────────────────────────

export const upsertGroupOverride = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { isHidden, individualMargin } = req.body;

    const update = {};
    if (isHidden !== undefined) update.isHidden = Boolean(isHidden);
    if (individualMargin !== undefined) {
      // empty string or explicit null clears the margin
      update.individualMargin =
        individualMargin === "" || individualMargin === null || individualMargin == 0
          ? null
          : Number(individualMargin);
    }

    const override = await SabaoonGroupOverride.findOneAndUpdate(
      { groupId: String(groupId) },
      { $set: update },
      { upsert: true, new: true }
    );

    return res.json({ success: true, data: override });
  } catch (error) {
    console.error("Error upserting group override:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to update group override" });
  }
};

// ─────────────────────────────────────────────────────────
// CREATE BOOKING ON SABAOON
// ─────────────────────────────────────────────────────────

/**
 * Sends a booking to the Sabaoon API.
 *
 * @param {object} params
 * @param {string}   params.groupId          Sabaoon's numeric group_id
 * @param {string}   params.pnr              PNR string (may contain " / " for two PNRs)
 * @param {string}   params.bookingReference Our internal booking reference (used as roe)
 * @param {number}   params.adultsCount
 * @param {number}   params.childrenCount
 * @param {number}   params.infantsCount
 * @param {object[]} params.passengers       Passenger objects from our Booking model
 * @param {object}   params.pricing          Pricing object from our Booking model
 *
 * @returns {{ transactionId: number }} Sabaoon transaction_id
 */
export const createSabaoonBooking = async ({
  groupId,
  pnr,
  bookingReference,
  adultsCount,
  childrenCount,
  infantsCount,
  passengers,
  pricing,
}) => {
  const tokenRecord = await getValidSabaoonToken();
  const token = tokenRecord.token;

  if (!token) {
    throw new Error("No valid Sabaoon token available");
  }

  console.log(`[Sabaoon] Creating booking with token: ${token.slice(0, 8)}...`);

  // Split PNR into pnr_1 / pnr_2 (Sabaoon sometimes has "PNR1 / PNR2")
  const pnrParts = (pnr || "").split(/\s*\/\s*/);
  const pnr_1 = pnrParts[0] || "";
  const pnr_2 = pnrParts[1] || "";

  const totalSeats = adultsCount + childrenCount; // Sabaoon counts infants differently

  // Build form-data body (Sabaoon backend is PHP and expects multipart/form-data,
  // matching the same format used by the login endpoint).
  const form = new FormData();

  form.append("token", token);
  form.append("agent_id", process.env.SABAOON_AGENT_CODE || "");
  form.append("roe", bookingReference);
  form.append("no_of_seat", String(totalSeats));
  form.append("group_id", String(groupId));
  form.append("pnr_1", pnr_1);
  form.append("pnr_2", pnr_2);
  // Explicit passenger type counts so Sabaoon tallies correctly
  form.append("api_adults", String(adultsCount));
  form.append("api_childs", String(childrenCount));
  form.append("api_infants", String(infantsCount));

  // Sabaoon expects numeric human_type: 1=adult, 2=child, 3=infant
  const humanTypeMap = { adult: "1", child: "2", infant: "3" };

  for (const p of passengers) {
    form.append("pax_title[]", p.title || "Mr");
    form.append("human_type[]", humanTypeMap[(p.type || "Adult").toLowerCase()] || "1");
    form.append("sur_name[]", p.surName || "");
    form.append("given_name[]", p.givenName || "");
    form.append("pass_no[]", p.passport || "");
    form.append("dob[]", formatDate(p.dateOfBirth));
    form.append("doi[]", ""); // passport issue date not collected
    form.append("doe[]", formatDate(p.passportExpiry));
  }

  // Price arrays — one entry per passenger of that type.
  // Always send the original base price to Sabaoon (before any margin markup).
  // Fall back to adultPrice if base prices are not stored (legacy bookings).
  const sabaoonAdultPrice = pricing.adultBasePrice || pricing.adultPrice || 0;
  const sabaoonChildPrice = pricing.childBasePrice || pricing.childPrice || 0;
  const sabaoonInfantPrice = pricing.infantBasePrice || pricing.infantPrice || 0;

  for (let i = 0; i < adultsCount; i++)
    form.append("adult_price[]", String(sabaoonAdultPrice));
  for (let i = 0; i < childrenCount; i++)
    form.append("child_price[]", String(sabaoonChildPrice));
  for (let i = 0; i < infantsCount; i++)
    form.append("infant_price[]", String(sabaoonInfantPrice));

  const response = await axios.post(
    `${process.env.SABAOON_API_URL}/booking`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: `Token ${token}`,
      },
    }
  );

  console.log("[Sabaoon] Booking response:", JSON.stringify(response.data));

  const { status, message, transaction_id } = response.data;

  if (status !== "success") {
    throw new Error(message || "Sabaoon booking API returned a failure status");
  }

  return { transactionId: transaction_id };
};