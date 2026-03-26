import fs from "fs/promises";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import packageModel from "../models/packageModel.js";
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

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isRoomPackageType = (value) =>
  String(value || "").trim().toLowerCase() === "room package";

const defaultFilePath = path.join(__dirname, "..", "data", "mrhPackagesFromRates.json");
const sourceFile = getArgValue("--file") || defaultFilePath;

const connect = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in backend/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI);
};

const loadRecords = async () => {
  const raw = await fs.readFile(sourceFile, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Package seed file must contain an array.");
  }

  return parsed;
};

const findRoomTypeByName = (name) =>
  roomTypeModel.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(normalizeName(name))}$`, "i") },
  });

const buildDuplicateQuery = ({ name, packageType, roomTypeId }) => ({
  name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
  packageType: { $regex: new RegExp(`^${escapeRegex(packageType)}$`, "i") },
  roomTypeId: roomTypeId || null,
});

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
    const packageType = normalizeName(record.packageType);
    const description = typeof record.description === "string" ? record.description : "";
    const price = Number(record.price);
    const amenities = Array.isArray(record.amenities)
      ? record.amenities.map((item) => normalizeName(item)).filter(Boolean)
      : [];
    const roomTypeName = normalizeName(record.roomType);

    if (!name || !packageType || !Number.isFinite(price) || price < 0) {
      throw new Error(`Record ${index + 1} is missing a valid name, packageType, or price.`);
    }

    let roomTypeDoc = null;
    if (isRoomPackageType(packageType)) {
      if (!roomTypeName) {
        throw new Error(`Record ${index + 1} (${name}) must include a room type.`);
      }

      roomTypeDoc = await findRoomTypeByName(roomTypeName);
      if (!roomTypeDoc) {
        throw new Error(`Record ${index + 1} (${name}) references missing room type: ${roomTypeName}`);
      }
    }

    const query = buildDuplicateQuery({
      name,
      packageType,
      roomTypeId: roomTypeDoc?._id || null,
    });

    const existingPackage = await packageModel.findOne(query);
    const payload = {
      name,
      packageType,
      roomTypeId: roomTypeDoc?._id || null,
      description,
      price,
      amenities,
    };

    const sampleBase = {
      name,
      packageType,
      roomType: roomTypeName || null,
      price,
    };

    if (!existingPackage) {
      stats.created += 1;
      if (stats.samples.length < 10) {
        stats.samples.push({ action: APPLY ? "created" : "would-create", ...sampleBase });
      }

      if (APPLY) {
        await packageModel.create(payload);
      }
      continue;
    }

    const current = {
      name: existingPackage.name,
      packageType: existingPackage.packageType,
      roomTypeId: String(existingPackage.roomTypeId || ""),
      description: String(existingPackage.description || ""),
      price: Number(existingPackage.price),
      amenities: JSON.stringify(existingPackage.amenities || []),
    };

    const next = {
      name: payload.name,
      packageType: payload.packageType,
      roomTypeId: String(payload.roomTypeId || ""),
      description: String(payload.description || ""),
      price: Number(payload.price),
      amenities: JSON.stringify(payload.amenities || []),
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
      Object.assign(existingPackage, payload);
      await existingPackage.save();
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
      console.error("\nPackage import failed:", error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.connection.close().catch(() => {});
    });
}

export default main;
