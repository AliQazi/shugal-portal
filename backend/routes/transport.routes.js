import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { getTransports, createTransport, updateTransport, deleteTransport } from "../controllers/transport.controller.js";

const router = express.Router();

router.get("/", getTransports);
router.post("/", protect, createTransport);
router.put("/", protect, updateTransport);
router.delete("/", protect, deleteTransport);

export default router;
