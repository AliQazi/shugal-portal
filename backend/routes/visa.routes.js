import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { getVisas, createVisa, updateVisa, deleteVisa } from "../controllers/visa.controller.js";

const router = express.Router();

router.get("/", getVisas);
router.post("/", protect, createVisa);
router.put("/", protect, updateVisa);
router.delete("/", protect, deleteVisa);

export default router;
