import fs from "fs/promises";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import buildingModel from "../models/buildingModel.js";
import roomModel from "../models/roomModel.js";
import roomTypeModel from "../models/roomtypeModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const APPLY = process.argv.includes("--apply");

const getArgValue = (flag) => {
  const index = process.argv.indexOf(flag);
  if (index === -1) return "";
  return String(process.argv[index + 1] || "").trim();
};

const normalizeName = (value) => String(value || "").trim();

const normalizeRoomTypeName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const getRoomCapacityValidationMessage = (roomTypeName, rawCapacity) => {
  const normalizedType = normalizeRoomTypeName(roomTypeName);
  const capacity = Number(rawCapacity);

  if (!Number.isFinite(capacity) || capacity < 1) {
    return "Room capacity must be at least 1.";
  }

  if (normalizedType === "individual" && capacity !== 1) {
    return "Individual rooms must have exactly 1 guest capacity.";
  }

  if (normalizedType === "individual with pullout" && capacity > 2) {
    return "Individual with Pullout rooms cannot have more than 2 guest capacity.";
  }

  if (normalizedType === "dormitory" && capacity < 3) {
    return "Dormitory rooms must have at least 3 guest capacity.";
  }

  return "";
};

const defaultFilePath = path.join(__dirname, "..", "data", "mrhRoomsStartAtRoom2.json");
const sourceFile = getArgValue("--file") || defaultFilePath;

const connect = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in backend/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI);
};

const findByName = (model, name) =>
  model.findOne({
    name: { $regex: new RegExp(`^${normalizeName(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
  });

const ensureReference = async (model, name) => {
  const normalized = normalizeName(name);
  if (!normalized) {
    throw new Error("Missing required reference name.");
  }

  const existing = await findByName(model, normalized);
  if (existing) return existing;

  if (!APPLY) {
    return { _id: null, name: normalized, isDryRunReference: true };
  }

  return model.create({ name: normalized });
};

const loadRecords = async () => {
  const raw = await fs.readFile(sourceFile, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Room seed file must contain an array.");
  }

  return parsed;
};

const main = async () => {
  const records = await loadRecords();
  await connect();

  const stats = {
    mode: APPLY ? "apply" : "dry-run",
    file: sourceFile,
    total: records.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    samples: [],
  };

  for (const [index, record] of records.entries()) {
    const name = normalizeName(record.name);
    const buildingName = normalizeName(record.building);
    const roomTypeName = normalizeName(record.roomType);
    const description = normalizeName(record.description);
    const capacity = Number(record.capacity);
    const amenities = Array.isArray(record.amenities) ? record.amenities : [];
    const images = Array.isArray(record.images) ? record.images : [];
    const available = record.available !== false;

    if (!name || !buildingName || !roomTypeName || !description) {
      throw new Error(`Record ${index + 1} is missing name, building, roomType, or description.`);
    }

    const validationMessage = getRoomCapacityValidationMessage(roomTypeName, capacity);
    if (validationMessage) {
      throw new Error(`Record ${index + 1} (${name}) is invalid: ${validationMessage}`);
    }

    const [buildingDoc, roomTypeDoc] = await Promise.all([
      ensureReference(buildingModel, buildingName),
      ensureReference(roomTypeModel, roomTypeName),
    ]);

    const existingRoom =
      buildingDoc?._id
        ? await roomModel.findOne({ name, buildingId: buildingDoc._id })
        : null;

    const payload = {
      name,
      buildingId: buildingDoc._id,
      roomTypeId: roomTypeDoc._id,
      capacity,
      description,
      amenities,
      images,
      coverImage: images[0] || "",
      available,
    };

    const sampleBase = {
      name,
      building: buildingName,
      roomType: roomTypeName,
      capacity,
    };

    if (!existingRoom) {
      stats.created += 1;
      if (stats.samples.length < 10) {
        stats.samples.push({ action: APPLY ? "created" : "would-create", ...sampleBase });
      }

      if (APPLY) {
        await roomModel.create(payload);
      }
      continue;
    }

    const current = {
      name: existingRoom.name,
      buildingId: String(existingRoom.buildingId || ""),
      roomTypeId: String(existingRoom.roomTypeId || ""),
      capacity: Number(existingRoom.capacity),
      description: String(existingRoom.description || ""),
      amenities: JSON.stringify(existingRoom.amenities || []),
      images: JSON.stringify(existingRoom.images || []),
      coverImage: String(existingRoom.coverImage || ""),
      available: Boolean(existingRoom.available),
    };

    const next = {
      name: payload.name,
      buildingId: String(payload.buildingId || ""),
      roomTypeId: String(payload.roomTypeId || ""),
      capacity: Number(payload.capacity),
      description: String(payload.description || ""),
      amenities: JSON.stringify(payload.amenities || []),
      images: JSON.stringify(payload.images || []),
      coverImage: String(payload.coverImage || ""),
      available: Boolean(payload.available),
    };

    const changed = Object.keys(next).some((key) => current[key] !== next[key]);

    if (!changed) {
      stats.unchanged += 1;
      continue;
    }

    stats.updated += 1;
    if (stats.samples.length < 10) {
      stats.samples.push({ action: APPLY ? "updated" : "would-update", ...sampleBase });
    }

    if (APPLY) {
      Object.assign(existingRoom, payload);
      await existingRoom.save();
    }
  }

  console.log(JSON.stringify(stats, null, 2));

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to write changes.");
  }
};

if (path.resolve(process.argv[1] || "") === __filename) {
  main()
    .catch((error) => {
      console.error("\nRoom import failed:", error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.connection.close().catch(() => {});
    });
}

export default main;
