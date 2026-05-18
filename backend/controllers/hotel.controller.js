import Hotel from "../models/Hotel.js";

export const getHotels = async (req, res) => {
  try {
    const hotels = await Hotel.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: hotels });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createHotel = async (req, res) => {
  try {
    const { name, city, distance, rating, mapUrl } = req.body;
    const hotel = await Hotel.create({ name, city, distance, rating, mapUrl });
    res.status(201).json({ success: true, data: hotel });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateHotel = async (req, res) => {
  try {
    const { id, name, city, distance, rating, mapUrl } = req.body;
    const hotel = await Hotel.findByIdAndUpdate(
      id,
      { name, city, distance, rating, mapUrl },
      { new: true, runValidators: true }
    );
    if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
    res.status(200).json({ success: true, data: hotel });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteHotel = async (req, res) => {
  try {
    const { id } = req.body;
    const hotel = await Hotel.findByIdAndDelete(id);
    if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
    res.status(200).json({ success: true, message: "Hotel deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
