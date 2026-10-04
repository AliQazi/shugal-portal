import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

let server;
let buildGDSBookingTicketHTML;

before(async () => {
  globalThis.sessionStorage = { getItem: () => null };
  globalThis.localStorage = { getItem: () => null };
  server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  ({ buildGDSBookingTicketHTML } = await server.ssrLoadModule("/src/utils/flightTicketPrint.tsx"));
});

after(async () => { await server?.close(); });

const booking = {
  status: "on hold",
  airline: { name: "Pakistan International Airline" },
  flightNumber: "007",
  sector: "LHE-JED",
  departureDate: "2026-10-16",
  pricing: { adultPrice: 250000, grandTotal: 250000 },
  passengers: [{ title: "Mr", givenName: "Ali", surName: "Qazi", type: "adult" }],
};

test("fare ticket includes price summary, passenger fare, and grand total", () => {
  const html = buildGDSBookingTicketHTML(booking, true);
  assert.match(html, /Price \(PKR\)/);
  assert.match(html, /<th[^>]*>Fare<\/th>/);
  assert.match(html, /Grand Total/);
  assert.match(html, /PKR 250,000/);
});

test("no-fare ticket keeps itinerary while removing all fare fields", () => {
  const html = buildGDSBookingTicketHTML(booking, false);
  assert.match(html, /Flight Segments/);
  assert.match(html, /Passenger\(s\)/);
  assert.match(html, /Ali Qazi/);
  assert.doesNotMatch(html, /Price \(PKR\)|Grand Total|<th[^>]*>Fare<\/th>|PKR 250,000/);
});

test("footer shows the issuing agent's city with a neutral skyline", () => {
  const html = buildGDSBookingTicketHTML({ ...booking, userId: { city: "Lahore" } }, true);
  assert.match(html, /Lahore/);
  assert.match(html, /ticket-generic-skyline/);
  assert.doesNotMatch(html, /Faisalabad/);
});
