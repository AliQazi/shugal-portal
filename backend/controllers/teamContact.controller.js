import TeamContact from "../models/TeamContact.js";

// Get all team contacts
export const getTeamContacts = async (req, res) => {
  try {
    const contacts = await TeamContact.find();
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add a new team contact
export const addTeamContact = async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;
    const contact = new TeamContact({ name, email, phone, role });
    await contact.save();
    res.status(201).json(contact);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete a team contact
export const deleteTeamContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await TeamContact.findByIdAndDelete(id);
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json({ message: "Contact deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
