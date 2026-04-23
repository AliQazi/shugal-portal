import express from "express";
import {
  getTeamContacts,
  addTeamContact,
  deleteTeamContact,
} from "../controllers/teamContact.controller.js";

const router = express.Router();

// Get all team contacts
router.get("/", getTeamContacts);

// Add a new team contact
router.post("/", addTeamContact);

// Delete a team contact
router.delete("/:id", deleteTeamContact);

export default router;
