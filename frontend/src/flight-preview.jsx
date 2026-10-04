import React from "react";
import { createRoot } from "react-dom/client";
import FlightOfferCards from "./pages/Frontend/AllGroups/FlightOfferCards";

const groups = [
  { id: "roundtrip", source: "admin", dept_date: "2026-11-09", price: 165000, isOwnGroup: true, showSeat: true, available_no_of_pax: 20, airline: { airline_name: "Fly Jinnah" }, sector: "LHE-JED-LHE", details: [
    { flight_no: "9P 586", dep_date: "2026-11-09", dept_time: "17:30", origin: "LHE", destination: "JED", arv_time: "21:45", baggage: "20+7", meal: "Yes" },
    { flight_no: "9P 587", dep_date: "2026-11-28", dept_time: "22:45", origin: "JED", destination: "LHE", arv_time: "05:35", baggage: "30+7", meal: "Yes" },
  ] },
  { id: "oneway", source: "admin", dept_date: "2026-10-16", price: 250000, priceOnCall: { adult: true, seats: true }, isOwnGroup: true, showSeat: true, available_no_of_pax: 300, airline: { airline_name: "PIA" }, sector: "LHE-JED", details: [
    { flight_no: "PK 007", dep_date: "2026-10-16", dept_time: "04:56", origin: "LHE", destination: "JED", arv_time: "04:00", baggage: "30+7", meal: "Yes" },
  ] },
];

document.body.style.cssText = "margin:0;background:#f3f7fb;padding:16px;font-family:Arial,sans-serif;box-sizing:border-box";
createRoot(document.getElementById("root")).render(
  <div className="flight-result flight-result--cards">
    <FlightOfferCards groups={groups} airlineLogo="" airlineName="" sector="" user={{ showHideButton: true }} headerType="dashboard" copiedRow={{}} handleCopyRow={() => {}} handleBookNow={() => {}} getDisplayDetails={(group) => group.details} getEffectiveSector={(group) => group.sector} getEffectiveSeats={(group) => group.priceOnCall?.seats ? "Seats on call" : group.available_no_of_pax} toAirportCode={(value) => value} formatBaggageLabel={(value) => value} calculatePriceAfterMargin={(value) => value} />
  </div>,
);
