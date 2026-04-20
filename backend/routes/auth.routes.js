import express from "express";
import {
   registerUser,
   loginUser,
   getProfile,
   getAllUsers,
   getUserById,
   updateUserStatus,
   updatePriceOnCall,
   updateShowHideButton,
   updateUserProfile,
   deleteUser,
   changePassword,
   requestPasswordReset,
   resetPassword,
   changeUserPassword,
   sendUserCredentials,
   updateBookNowButtonBulk
 
} from "../controllers/auth.controller.js";

import { protect, adminOnly } from "../middleware/auth.middleware.js";
import { uploadProfileLogo } from "../config/cloudinary.js";

const router = express.Router();

/* ===========================
   AUTH ROUTES
=========================== */

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/profile", protect, getProfile);

// Update own profile (for logged-in users)
// Supports both base64 in body or file upload via multipart/form-data
router.put("/profile", protect, uploadProfileLogo.single('logo'), updateUserProfile);

router.get("/users", protect, adminOnly, getAllUsers);
router.get("/users/:id", protect, adminOnly, getUserById);

router.put("/users/:id", protect, adminOnly, uploadProfileLogo.single('logo'), updateUserProfile);

router.patch("/users/:id/status", protect, adminOnly, updateUserStatus);
router.patch("/users/:id/price-on-call", protect, adminOnly, updatePriceOnCall);
router.patch("/users/:id/show-booking-now", protect, adminOnly, updateShowHideButton);
router.patch("/users/bulk-show-booking-now", protect, adminOnly, updateBookNowButtonBulk);

router.delete("/users/:id", protect, adminOnly, deleteUser);

/* ===========================
   PASSWORD MANAGEMENT ROUTES
=========================== */

// Change password for logged-in user
router.post("/change-password", protect, changePassword);

// Request password reset (forgot password)
router.post("/forgot-password", requestPasswordReset);

// Reset password with token
router.post("/reset-password", resetPassword);

// Admin: Change user/agency password
router.post("/admin/change-user-password", protect, adminOnly, changeUserPassword);

// Admin: Send credentials to user
router.post("/users/:userId/send-credentials", protect, adminOnly, sendUserCredentials);

export default router;
