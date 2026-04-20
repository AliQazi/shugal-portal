import jwt from "jsonwebtoken";
import Register from "../models/Register.js";
import axios from "axios";

export const protect = async (req, res, next) => {
  try {
    let token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await Register.findById(decoded.id);
    
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: "Invalid token" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};


/* ===========================
   AL-HAIDER AUTHENTICATION MIDDLEWARE
=========================== */
export const alHaiderAuthMiddleware = async (req, res, callback) => {
  
  try {
    // Prefer a pre-provided token from environment if available
    const staticToken = process.env.ALI_HAIDER_API_TOKEN;

    if (staticToken && staticToken.trim().length > 0) {
      req.alHaiderAPIToken = staticToken.trim();
      return callback();
    }

    const credentials = {
      email: process.env.ALI_HAIDER_API_EMAIL,
      password: process.env.ALI_HAIDER_API_PASSWORD
    };

    if (!credentials.email || !credentials.password) {
      console.error("MISSING AL-HAIDER API CREDENTIALS IN ENV!");
      throw new Error("Al-Haider API credentials not configured in environment variables");
    }

    const response = await axios.post(
      `${process.env.ALI_HAIDER_API_URL}api/login`,
      credentials,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000
      }
    );

    if (!response?.data?.token) {
      throw new Error(`No token received from Al-Haider API. Response data: ${JSON.stringify(response.data)}`);
    }

    // Attach token to request
    req.alHaiderAPIToken = response.data.token;
    callback();

  } catch (error) {
    console.error(`Al-Haider login API error:`, error.message);
    
    if (error.response) {
      console.error("Al-Haider login API error response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.code) {
      console.error("Network error code:", error.code);
    }
    
    // Pass error to callback
    return callback(error);
  }
};
