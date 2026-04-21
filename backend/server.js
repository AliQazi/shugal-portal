import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import dbConnection from "./config/db.js";

import groupTicketingRoutes from "./routes/groupTicketing.routes.js";
import authRoutes from "./routes/auth.routes.js";
import bankRoutes from "./routes/bank.routes.js";
import sectorRoutes from "./routes/sector.routes.js";
import airlineRoutes from "./routes/airline.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import alHaiderAPIRoutes from "./routes/alHaiderAPI.routes.js";
import sabaoonAPIRoutes from "./routes/sabaoonAPI.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import exportRoutes from "./routes/export.routes.js";
import specialOffer from "./routes/specialOffer.route.js";

import { getValidSabaoonToken, initializeSabaoonToken } from "./utils/sabaoonToken.js";
import testEmail from "./utils/testEmail.js";
import { startBookingExpiryJob } from "./utils/bookingExpiryJob.js";

dotenv.config();
dbConnection();
testEmail();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://worldflytickets.com",
      "https://www.worldflytickets.com",
      "https://shaheenwingstravels.com"
    ],
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

app.use("/api/group-ticketing", groupTicketingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/sector", sectorRoutes);
app.use("/api/airline", airlineRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/al-haider", alHaiderAPIRoutes);
app.use("/api/sabaoon", sabaoonAPIRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/specialOffer", specialOffer);

/* Initialize Sabaoon token: if DB is empty, hit login API and save token */
(async () => {
  try {
    // Wait a bit for DB connection to be established
    await new Promise(resolve => setTimeout(resolve, 1000));
    await initializeSabaoonToken();
  } catch (err) {
    console.warn("Sabaoon token initialization failed:", err.message);
  }
})();

/* 🔥 Start Expiry Cron Job */
startBookingExpiryJob();

app.get("/", (req, res) => {
  res.send("Shaheen Wings travel and tours (Pvt Ltd ) API is running");
});

const PORT = process.env.PORT || 8007;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
