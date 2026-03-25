import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import userModel from "../models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const APPLY = process.argv.includes("--apply");

const connect = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in backend/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI);
};

const resolveEmailVerified = (user) =>
  user.authProvider === "google" ||
  ["admin", "staff"].includes(user.role);

const main = async () => {
  await connect();
  const collection = mongoose.connection.db.collection("users");

  const stats = {
    mode: APPLY ? "apply" : "dry-run",
    checked: 0,
    missingField: 0,
    updated: 0,
    samples: [],
  };

  for await (const user of collection.find(
    {},
    {
      projection: {
        _id: 1,
        email: 1,
        authProvider: 1,
        role: 1,
        emailVerified: 1,
        firstName: 1,
      },
    }
  )) {
    stats.checked += 1;

    if (typeof user.emailVerified === "boolean") {
      continue;
    }

    const nextEmailVerified = resolveEmailVerified(user);
    stats.missingField += 1;

    if (stats.samples.length < 20) {
      stats.samples.push({
        userId: String(user._id),
        email: user.email || "",
        firstName: user.firstName || "",
        nextEmailVerified,
      });
    }

    if (APPLY) {
      await collection.updateOne(
        { _id: user._id },
        { $set: { emailVerified: nextEmailVerified } }
      );
      stats.updated += 1;
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
      console.error("\nMigration failed:", error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.connection.close().catch(() => {});
    });
}

export default main;
