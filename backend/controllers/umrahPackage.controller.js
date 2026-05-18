import UmrahPackage from "../models/UmrahPackage.js";
import { cloudinary } from "../config/cloudinary.js";

export const getUmrahPackages = async (req, res) => {
  try {
    const packages = await UmrahPackage.find({ isActive: true })
      .populate("umrahGroupTicket")
      .populate("visa")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: packages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUmrahPackageById = async (req, res) => {
  try {
    const pkg = await UmrahPackage.findById(req.params.id)
      .populate("umrahGroupTicket")
      .populate("visa");
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });
    res.status(200).json({ success: true, data: pkg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createUmrahPackage = async (req, res) => {
  try {
    const body = typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    let logoUrl = body.logo || "";
    let flightLogoUrl = body.flightLogo || "";

    if (req.files) {
      if (req.files.logo && req.files.logo[0]) {
        logoUrl = req.files.logo[0].path;
      }
      if (req.files.flightLogo && req.files.flightLogo[0]) {
        flightLogoUrl = req.files.flightLogo[0].path;
      }
    }

    const pkg = await UmrahPackage.create({
      ...body,
      logo: logoUrl,
      flightLogo: flightLogoUrl,
    });
    res.status(201).json({ success: true, data: pkg });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateUmrahPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const body = typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    let updateData = { ...body };

    if (req.files) {
      if (req.files.logo && req.files.logo[0]) {
        updateData.logo = req.files.logo[0].path;
      }
      if (req.files.flightLogo && req.files.flightLogo[0]) {
        updateData.flightLogo = req.files.flightLogo[0].path;
      }
    }

    const pkg = await UmrahPackage.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });
    res.status(200).json({ success: true, data: pkg });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteUmrahPackage = async (req, res) => {
  try {
    const { id } = req.body;
    const pkg = await UmrahPackage.findByIdAndDelete(id);
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });
    res.status(200).json({ success: true, message: "Package deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
