import express from "express";
import { protect, adminOnly } from "../middleware/auth.middleware.js";
import {
  getMarginRules,
  setMarginRule,
} from "../controllers/marginRule.controller.js";

const router = express.Router();

router.get("/", protect, adminOnly, getMarginRules);
router.put("/", protect, adminOnly, setMarginRule);

export default router;
