import Transport from "../models/Transport.js";

export const getTransports = async (req, res) => {
  try {
    const transports = await Transport.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: transports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTransport = async (req, res) => {
  try {
    const { route, transportType } = req.body;
    const transport = await Transport.create({ route, transportType });
    res.status(201).json({ success: true, data: transport });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTransport = async (req, res) => {
  try {
    const { id, route, transportType } = req.body;
    const transport = await Transport.findByIdAndUpdate(
      id,
      { route, transportType },
      { new: true, runValidators: true }
    );
    if (!transport) return res.status(404).json({ success: false, message: "Transport not found" });
    res.status(200).json({ success: true, data: transport });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteTransport = async (req, res) => {
  try {
    const { id } = req.body;
    const transport = await Transport.findByIdAndDelete(id);
    if (!transport) return res.status(404).json({ success: false, message: "Transport not found" });
    res.status(200).json({ success: true, message: "Transport deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
