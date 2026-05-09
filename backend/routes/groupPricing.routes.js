import express from "express";

import {
  getGroupPricing,
  upsertGroupPricing,
} from "../controllers/groupPricing.controller.js";

const router = express.Router();

router.get("/group-pricing", getGroupPricing);

router.post("/group-pricing", upsertGroupPricing);

export default router;
