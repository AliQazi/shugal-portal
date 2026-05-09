import GroupPricing from "../models/groupPricingModel.js";

// ================================
// GET ALL
// ================================
export const getGroupPricing = async (req, res) => {
  try {
    const data = await GroupPricing.find().sort({ category: 1 });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch group pricing",
    });
  }
};

// ================================
// ADD / UPDATE
// ================================
export const upsertGroupPricing = async (req, res) => {
  try {
    const { category, margin, discount } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    const updated = await GroupPricing.findOneAndUpdate(
      { category },
      {
        category,
        margin: Number(margin) || 0,
        discount: Number(discount) || 0,
      },
      {
        new: true,
        upsert: true,
      },
    );

    res.status(200).json({
      success: true,
      message: "Group pricing saved successfully",
      data: updated,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to save group pricing",
    });
  }
};
