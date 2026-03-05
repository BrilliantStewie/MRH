import packageModel from "../models/packageModel.js";

// ➕ Add Package
const addPackage = async (req, res) => {
  try {

    const { name, roomType, description, price, includesFood, includesAC } = req.body;

    if (!name || !roomType || price === undefined) {
      return res.json({
        success: false,
        message: "Name, room type, and price are required"
      });
    }

    const existingPackage = await packageModel.findOne({
      roomType,
      includesAC,
      includesFood
    });

    if (existingPackage) {
      return res.json({
        success: false,
        message: "This package configuration already exists"
      });
    }

    const newPackage = new packageModel({
      name,
      roomType,
      description,
      price: Number(price),
      includesFood: Boolean(includesFood),
      includesAC: Boolean(includesAC)
    });

    await newPackage.save();

    res.json({
      success: true,
      message: "Package added successfully",
      package: newPackage
    });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};


// 📦 Get All Packages
const getAllPackages = async (req, res) => {
  try {

    const packages = await packageModel
      .find()
      .populate("roomType")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      packages
    });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};


// ✏️ Update Package
const updatePackage = async (req, res) => {
  try {

    const { id } = req.params;

    const updated = await packageModel.findByIdAndUpdate(
      id,
      {
        ...req.body,
        price: Number(req.body.price)
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Package updated",
      package: updated
    });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};


// ❌ Delete Package
const deletePackage = async (req, res) => {
  try {

    const { id } = req.params;

    await packageModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Package deleted"
    });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export {
  addPackage,
  getAllPackages,
  updatePackage,
  deletePackage
};