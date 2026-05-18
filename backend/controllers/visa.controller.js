import Visa from "../models/Visa.js";

export const getVisas = async (req, res) => {
  try {
    const visas = await Visa.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: visas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createVisa = async (req, res) => {
  try {
    const { visaType, processingTime, buyingPrice, sellingPrice, currency, transport, description } = req.body;
    const visa = await Visa.create({ visaType, processingTime, buyingPrice, sellingPrice, currency, transport, description });
    res.status(201).json({ success: true, data: visa });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateVisa = async (req, res) => {
  try {
    const { id, visaType, processingTime, buyingPrice, sellingPrice, currency, transport, description } = req.body;
    const visa = await Visa.findByIdAndUpdate(
      id,
      { visaType, processingTime, buyingPrice, sellingPrice, currency, transport, description },
      { new: true, runValidators: true }
    );
    if (!visa) return res.status(404).json({ success: false, message: "Visa not found" });
    res.status(200).json({ success: true, data: visa });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteVisa = async (req, res) => {
  try {
    const { id } = req.body;
    const visa = await Visa.findByIdAndDelete(id);
    if (!visa) return res.status(404).json({ success: false, message: "Visa not found" });
    res.status(200).json({ success: true, message: "Visa deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
