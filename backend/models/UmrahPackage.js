import mongoose from "mongoose";

const HotelEntrySchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel" },
    hotelName: { type: String, default: "" },
    supplier: { type: String, default: "" },
    city: { type: String, default: "" },
    distance: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    checkIn: { type: String, default: "" },
    checkOut: { type: String, default: "" },
    nights: { type: Number, default: 0 },
    mapUrl: { type: String, default: "" },
  },
  { _id: false }
);

const TransportEntrySchema = new mongoose.Schema(
  {
    transport: { type: mongoose.Schema.Types.ObjectId, ref: "Transport" },
    route: { type: String, default: "" },
    supplier: { type: String, default: "" },
    transportType: { type: String, default: "" },
  },
  { _id: false }
);

const FlightEntrySchema = new mongoose.Schema(
  {
    airline: { type: String, default: "" },
    flightNo: { type: String, default: "" },
    depDate: { type: Date, default: null },
    depTime: { type: String, default: "" },
    arrDate: { type: Date, default: null },
    arrTime: { type: String, default: "" },
    sectorFrom: { type: String, default: "" },
    sectorTo: { type: String, default: "" },
    fromTerminal: { type: String, default: "" },
    toTerminal: { type: String, default: "" },
    flightClass: { type: String, default: "" },
    baggage: { type: String, default: "" },
    meal: { type: String, default: "" },
  },
  { _id: false }
);

const UmrahPackageSchema = new mongoose.Schema(
  {
    packageName: {
      type: String,
      required: [true, "Package name is required"],
      trim: true,
    },
    pnr: { type: String, trim: true, default: "" },
    sector: { type: String, trim: true, default: "" },
    airline: { type: String, trim: true, default: "" },
    groupName: { type: String, trim: true, default: "" },
    logo: { type: String, default: "" },
    flightLogo: { type: String, default: "" },
    umrahGroupTicket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupTicketing",
      default: null,
    },
    availablePackages: { type: Number, default: 0 },
    packageDuration: { type: Number, default: 0 },
    flights: [FlightEntrySchema],
    hotels: [HotelEntrySchema],
    transports: [TransportEntrySchema],
    visa: { type: mongoose.Schema.Types.ObjectId, ref: "Visa", default: null },
    roomTypes: {
      sharing: { type: Number, default: 0 },
      quint: { type: Number, default: 0 },
      quad: { type: Number, default: 0 },
      triple: { type: Number, default: 0 },
      double: { type: Number, default: 0 },
      childWithoutPackage: { type: Number, default: 0 },
      infantWithoutPackage: { type: Number, default: 0 },
    },
    notes: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const UmrahPackage = mongoose.model("UmrahPackage", UmrahPackageSchema);
export default UmrahPackage;
