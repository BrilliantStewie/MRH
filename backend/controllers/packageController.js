import packageModel from "../models/packageModel.js";

// ➕ Add Package
const addPackage = async (req, res) => {
  try {
    // 👇 ADD 'amenities' HERE 👇
    const { name, description, price, building, includesFood, includesAC, amenities } = req.body;

    const newPackage = new packageModel({
      name,
      description,
      price: Number(price),
      building,
      includesFood: Boolean(includesFood),
      includesAC: Boolean(includesAC),
      // 👇 AND PASS IT HERE 👇
      amenities: amenities || [] 
    });

    await newPackage.save();
    res.json({ success: true, message: "Package added", package: newPackage });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// 📦 Get All Packages
const getAllPackages = async (req, res) => {
  try {
    const packages = await packageModel.find().sort({ createdAt: -1 });
    res.json({ success: true, packages });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ✏️ Update Package
const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    await packageModel.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ success: true, message: "Package updated" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ❌ Delete Package (FIXED)
const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    await packageModel.findByIdAndDelete(id);
    res.json({ success: true, message: "Package deleted" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export { addPackage, getAllPackages, updatePackage, deletePackage };
