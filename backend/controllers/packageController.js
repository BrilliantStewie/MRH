import packageModel from "../models/packageModel.js";
import roomTypeModel from "../models/roomtypeModel.js";
import {
  escapeRegex,
  normalizeName,
  packageReferencePopulate,
  resolveNamedReference,
  serializePackage,
} from "../utils/dataConsistency.js";

const isRoomPackageType = (value) =>
  String(value || "").trim().toLowerCase() === "room package";

const shouldIncludeArchived = (req) =>
  String(req?.query?.includeArchived || "").trim().toLowerCase() === "true";

const parseAmenities = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const resolveRoomTypeDoc = async (value) => resolveNamedReference(roomTypeModel, value);

const buildDuplicateQuery = ({ name, packageType, roomTypeId, excludeId = null }) => {
  const query = {
    name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
    packageType: { $regex: new RegExp(`^${escapeRegex(packageType)}$`, "i") },
    roomTypeId: roomTypeId || null,
    isArchived: { $ne: true },
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return query;
};

const populatePackageById = (id) =>
  packageModel.findById(id).populate(packageReferencePopulate);

const addPackage = async (req, res) => {
  try {
    const {
      name,
      packageType,
      roomType,
      roomTypeId: providedRoomTypeId,
      description,
      price,
      amenities,
    } = req.body;

    const normalizedName = normalizeName(name);
    const normalizedPackageType = normalizeName(packageType);

    if (!normalizedName || !normalizedPackageType || price === undefined) {
      return res.json({
        success: false,
        message: "Name, package type, and price are required",
      });
    }

    const resolvedRoomType = isRoomPackageType(normalizedPackageType)
      ? await resolveRoomTypeDoc(providedRoomTypeId || roomType)
      : null;

    if (isRoomPackageType(normalizedPackageType) && !resolvedRoomType) {
      return res.json({
        success: false,
        message: "Please select a valid room type for room packages",
      });
    }

    const existingPackage = await packageModel.findOne(
      buildDuplicateQuery({
        name: normalizedName,
        packageType: normalizedPackageType,
        roomTypeId: resolvedRoomType?._id || null,
      })
    );

    if (existingPackage) {
      return res.json({
        success: false,
        message: "This package already exists",
      });
    }

    const newPackage = await packageModel.create({
      name: normalizedName,
      packageType: normalizedPackageType,
      roomTypeId: resolvedRoomType?._id || null,
      description: typeof description === "string" ? description : "",
      price: Number(price),
      amenities: parseAmenities(amenities),
    });

    const populatedPackage = await populatePackageById(newPackage._id);

    res.json({
      success: true,
      message: "Package added successfully",
      package: serializePackage(populatedPackage),
    });
  } catch (error) {
    const duplicateError =
      error?.code === 11000 ? "This package already exists" : error.message;
    res.json({ success: false, message: duplicateError });
  }
};

const getAllPackages = async (req, res) => {
  try {
    const includeArchived = shouldIncludeArchived(req);
    const packages = await packageModel
      .find(includeArchived ? {} : { isArchived: { $ne: true } })
      .populate(packageReferencePopulate)
      .sort({ isArchived: 1, createdAt: -1 });

    res.json({
      success: true,
      packages: packages.map((pkg) => serializePackage(pkg)),
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      packageType,
      roomType,
      roomTypeId: providedRoomTypeId,
      description,
      price,
      amenities,
    } = req.body;

    const existingPackage = await packageModel.findById(id);
    if (!existingPackage) {
      return res.json({ success: false, message: "Package not found" });
    }

    const normalizedName = normalizeName(name || existingPackage.name);
    const normalizedPackageType = normalizeName(packageType || existingPackage.packageType);
    const resolvedRoomType = isRoomPackageType(normalizedPackageType)
      ? await resolveRoomTypeDoc(providedRoomTypeId || roomType || existingPackage.roomTypeId)
      : null;

    if (isRoomPackageType(normalizedPackageType) && !resolvedRoomType) {
      return res.json({
        success: false,
        message: "Please select a valid room type for room packages",
      });
    }

    const duplicatePackage = await packageModel.findOne(
      buildDuplicateQuery({
        name: normalizedName,
        packageType: normalizedPackageType,
        roomTypeId: resolvedRoomType?._id || null,
        excludeId: id,
      })
    );

    if (duplicatePackage) {
      return res.json({
        success: false,
        message: "This package already exists",
      });
    }

    existingPackage.name = normalizedName;
    existingPackage.packageType = normalizedPackageType;
    existingPackage.roomTypeId = resolvedRoomType?._id || null;
    existingPackage.description =
      typeof description === "string" ? description : existingPackage.description;

    if (price !== undefined) {
      existingPackage.price = Number(price);
    }

    if (amenities !== undefined) {
      existingPackage.amenities = parseAmenities(amenities);
    }

    await existingPackage.save();

    const populatedPackage = await populatePackageById(existingPackage._id);

    res.json({
      success: true,
      message: "Package updated successfully",
      package: serializePackage(populatedPackage),
    });
  } catch (error) {
    const duplicateError =
      error?.code === 11000 ? "This package already exists" : error.message;
    res.json({ success: false, message: duplicateError });
  }
};

const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const existingPackage = await packageModel.findById(id);

    if (!existingPackage) {
      return res.json({ success: false, message: "Package not found" });
    }

    const willRestore = Boolean(existingPackage.isArchived);

    if (willRestore) {
      const duplicatePackage = await packageModel.findOne(
        buildDuplicateQuery({
          name: normalizeName(existingPackage.name),
          packageType: normalizeName(existingPackage.packageType),
          roomTypeId: existingPackage.roomTypeId || null,
          excludeId: existingPackage._id,
        })
      );

      if (duplicatePackage) {
        return res.json({
          success: false,
          message: "An active package with the same details already exists",
        });
      }
    }

    existingPackage.isArchived = !willRestore;
    existingPackage.archivedAt = willRestore ? null : new Date();
    await existingPackage.save();

    const populatedPackage = await populatePackageById(existingPackage._id);

    res.json({
      success: true,
      message: willRestore
        ? "Package restored successfully"
        : "Package archived successfully",
      package: serializePackage(populatedPackage),
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export {
  addPackage,
  getAllPackages,
  updatePackage,
  deletePackage,
};
