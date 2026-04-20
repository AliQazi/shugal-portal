import express from "express";
import {
  addSector,
  getSectors,
  getSectorsByGroup,
  getSectorById,
  updateSector,
  deleteSector,
  updateSectorOrder,
  getUnifiedGroups,
  applyMargin,
  getMargin,
} from "../controllers/sector.controller.js";

const router = express.Router();

// Get unified sectors and groups
router.get("/getUnifiedGroups", getUnifiedGroups);

// Get current margin
router.get("/getMargin", getMargin);

// Apply margin (save to DB)
router.post("/applyMargin", applyMargin);

// Add new sector
router.post("/add", addSector);

// Get all sectors
router.get("/", getSectors);

// Get sectors by group type
router.get("/group/:groupType", getSectorsByGroup);

// Get single sector by ID
router.get("/:id", getSectorById);

// Update sector
router.put("/:id", updateSector);

// update sector order
router.post("/updateSectorOrder", updateSectorOrder);

// Delete sector
router.delete("/:id", deleteSector);

export default router;
