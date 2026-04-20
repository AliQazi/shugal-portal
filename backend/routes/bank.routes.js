import express from "express";
import { upload } from "../config/cloudinary.js";
import {
  addBank,
  getBanks,
  getBankById,
  updateBank,
  deleteBank
} from "../controllers/bank.controller.js";

const router = express.Router();

// Add new bank (with logo upload)
router.post("/add", upload.single("logo"), addBank);

// Get all banks
router.get("/", getBanks);

// Get single bank by ID
router.get("/:id", getBankById);

// Update bank (with optional logo upload)
router.put("/:id", upload.single("logo"), updateBank);

// Delete bank
router.delete("/:id", deleteBank);

export default router;
