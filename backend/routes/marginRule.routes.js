import express from "express";
import { protect, adminOnly } from "../middleware/auth.middleware.js";
import {
  getMarginRules,
  setMarginRule,
  setMarginRulesBulk,
} from "../controllers/marginRule.controller.js";

const router = express.Router();

router.get("/", protect, adminOnly, getMarginRules);
router.put("/", protect, adminOnly, setMarginRule);
router.put("/bulk", protect, adminOnly, setMarginRulesBulk);

export default router;
