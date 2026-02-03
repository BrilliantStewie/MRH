import Room from "../models/roomModel.js";
import { v2 as cloudinary } from "cloudinary";

// helper: upload buffer to cloudinary
const uploadToCloudinary = (fileBuffer, folder = "mrh_rooms") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};

// ==========================================
// 1. ADD ROOM
// ==========================================
export const addRoom = async (req, res) => {
  try {
    const {
      name,
      room_type,
      building,
      capacity,
      description,
      amenities
    } = req.body;

    if (!name || !room_type || !building || !capacity || !description) {
      return res.json({ success: false, message: "All fields are required" });
    }

    if (!req.files || req.files.length === 0) {
      return res.json({
        success: false,
        message: "At least one room image is required"
      });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      if (!file.buffer || file.buffer.length === 0) {
        console.warn("Skipped empty file:", file.originalname);
        continue;
      }

      const imageUrl = await uploadToCloudinary(file.buffer);
      uploadedImages.push(imageUrl);
    }

    if (uploadedImages.length === 0) {
      return res.json({
        success: false,
        message: "Uploaded images were empty"
      });
    }

    let parsedAmenities = [];
    if (amenities) {
      try {
        parsedAmenities =
          typeof amenities === "string" ? JSON.parse(amenities) : amenities;
      } catch {
        parsedAmenities = [];
      }
    }

    const room = await Room.create({
      name,
      room_type,
      building,
      capacity: Number(capacity),
      description,
      amenities: parsedAmenities,
      images: uploadedImages,
      cover_image: uploadedImages[0],
      available: true
    });

    res.json({ success: true, message: "Room added successfully", room });
  } catch (error) {
    console.error("Add Room Error:", error);
    res.json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. GET ALL ROOMS
// ==========================================
export const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 });
    res.json({ success: true, rooms });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. UPDATE ROOM
// ==========================================
export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      room_type,
      building,
      capacity,
      description,
      amenities,
      existingImages
    } = req.body;

    const room = await Room.findById(id);
    if (!room) {
      return res.json({ success: false, message: "Room not found" });
    }

    if (name) room.name = name;
    if (room_type) room.room_type = room_type;
    if (building) room.building = building;
    if (capacity) room.capacity = Number(capacity);
    if (description) room.description = description;

    if (amenities) {
      try {
        room.amenities =
          typeof amenities === "string" ? JSON.parse(amenities) : amenities;
      } catch {}
    }

    let finalImages = [];
    if (existingImages) {
      try {
        finalImages = JSON.parse(existingImages);
      } catch {
        finalImages = [];
      }
    }

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (!file.buffer || file.buffer.length === 0) {
          console.warn("Skipped empty file:", file.originalname);
          continue;
        }

        const imageUrl = await uploadToCloudinary(file.buffer);
        finalImages.push(imageUrl);
      }
    }

    room.images = finalImages;
    room.cover_image = finalImages[0] || "";

    await room.save();

    res.json({ success: true, message: "Room updated successfully", room });
  } catch (error) {
    console.error("Update Room Error:", error);
    res.json({ success: false, message: error.message });
  }
};

// ==========================================
// 4. DELETE ROOM
// ==========================================
export const deleteRoom = async (req, res) => {
  try {
    const id = req.body.id || req.params.id;

    if (!id) {
      return res.json({ success: false, message: "Room ID required" });
    }

    const room = await Room.findByIdAndDelete(id);
    if (!room) {
      return res.json({ success: false, message: "Room not found" });
    }

    res.json({ success: true, message: "Room deleted successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ==========================================
// 5. TOGGLE AVAILABILITY
// ==========================================
export const changeAvailability = async (req, res) => {
  try {
    const { roomId } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.json({ success: false, message: "Room not found" });
    }

    room.available = !room.available;
    await room.save();

    res.json({ success: true, message: "Availability updated" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
