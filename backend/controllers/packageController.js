import packageModel from "../models/packageModel.js";

// ➕ Add Package
const addPackage = async (req, res) => {
  try {

    const { name, packageType, roomType, description, price, amenities } = req.body;

    // basic validation
    if (!name || !packageType || price === undefined) {
      return res.json({
        success: false,
        message: "Name, package type, and price are required"
      });
    }

    // prevent duplicate packages
    const existingPackage = await packageModel.findOne({
      name: name.trim(),
      packageType,
      roomType: roomType || null
    });

    if (existingPackage) {
      return res.json({
        success: false,
        message: "This package already exists"
      });
    }

    const newPackage = new packageModel({
      name: name.trim(),
      packageType: packageType.trim(),
      roomType: roomType || null,
      description: description || "",
      price: Number(price),
      amenities: amenities || []
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
    const { name, packageType, roomType, description, price, amenities } = req.body;

    const updated = await packageModel.findByIdAndUpdate(
      id,
      {
        name,
        packageType,
        roomType: roomType || null,
        description,
        price: Number(price),
        amenities
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Package updated successfully",
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
      message: "Package deleted successfully"
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