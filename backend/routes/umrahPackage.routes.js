import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { applyUmrahPackageRules } from "../middleware/marginVisibility.middleware.js";
import { uploadUmrahPackage } from "../config/cloudinary.js";
import {
  getUmrahPackages,
  getTravelNetworkUmrahPackages,
  getUmrahPackageById,
  createUmrahPackage,
  updateUmrahPackage,
  deleteUmrahPackage,
} from "../controllers/umrahPackage.controller.js";

const router = express.Router();

const uploadFields = uploadUmrahPackage.fields([
  { name: "logo", maxCount: 1 },
  { name: "flightLogo", maxCount: 1 },
]);

router.get("/", getUmrahPackages);
router.get("/travel-network", protect, applyUmrahPackageRules, getTravelNetworkUmrahPackages);
router.get("/:id", getUmrahPackageById);
router.post("/", protect, uploadFields, createUmrahPackage);
router.put("/:id", protect, uploadFields, updateUmrahPackage);
router.delete("/", protect, deleteUmrahPackage);

export default router;
