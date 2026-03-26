import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import validator from "validator";
import userModel from "../models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const APPLY = process.argv.includes("--apply");

const getArgValue = (flag) => {
  const index = process.argv.indexOf(flag);
  if (index === -1) return "";
  return String(process.argv[index + 1] || "").trim();
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const input = {
  email: normalizeEmail(getArgValue("--email") || process.env.ADMIN_EMAIL),
  password: String(getArgValue("--password") || process.env.ADMIN_PASSWORD || "").trim(),
  firstName: String(getArgValue("--first-name") || process.env.ADMIN_FIRST_NAME || "MRH").trim(),
  lastName: String(getArgValue("--last-name") || process.env.ADMIN_LAST_NAME || "Admin").trim(),
  middleName: String(getArgValue("--middle-name") || process.env.ADMIN_MIDDLE_NAME || "").trim(),
  suffix: String(getArgValue("--suffix") || process.env.ADMIN_SUFFIX || "").trim(),
  phone: String(getArgValue("--phone") || process.env.ADMIN_PHONE || "").trim() || null,
};

const connect = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in backend/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI);
};

const validateInput = () => {
  if (!input.email || !validator.isEmail(input.email)) {
    throw new Error("Provide a valid admin email with --email.");
  }

  if (!input.password || input.password.length < 8) {
    throw new Error("Provide an admin password with at least 8 characters using --password.");
  }

  if (!input.firstName || !input.lastName) {
    throw new Error("First name and last name are required.");
  }
};

const buildSummary = (mode, result) => ({
  mode,
  email: input.email,
  role: "admin",
  action: result,
  firstName: input.firstName,
  lastName: input.lastName,
  phone: input.phone,
});

const main = async () => {
  validateInput();
  await connect();

  const existingUser = await userModel.findOne({ email: input.email });

  if (!APPLY) {
    if (existingUser && existingUser.role !== "admin") {
      throw new Error(`A non-admin user already exists with email ${input.email}. Choose a different email.`);
    }

    const action = existingUser ? "would-update-existing-admin" : "would-create-admin";
    console.log(JSON.stringify(buildSummary("dry-run", action), null, 2));
    console.log("\nDry run only. Re-run with --apply to write changes.");
    return;
  }

  if (existingUser && existingUser.role !== "admin") {
    throw new Error(`A non-admin user already exists with email ${input.email}. Choose a different email.`);
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);

  if (existingUser) {
    existingUser.firstName = input.firstName;
    existingUser.middleName = input.middleName;
    existingUser.lastName = input.lastName;
    existingUser.suffix = input.suffix;
    existingUser.phone = input.phone;
    existingUser.password = hashedPassword;
    existingUser.passwordSet = true;
    existingUser.role = "admin";
    existingUser.emailVerified = true;
    existingUser.disabled = false;
    existingUser.sessionVersion = Number(existingUser.sessionVersion || 0) + 1;
    await existingUser.save();

    console.log(JSON.stringify(buildSummary("apply", "updated-existing-admin"), null, 2));
    return;
  }

  const adminUser = new userModel({
    firstName: input.firstName,
    middleName: input.middleName,
    lastName: input.lastName,
    suffix: input.suffix,
    email: input.email,
    phone: input.phone,
    password: hashedPassword,
    passwordSet: true,
    role: "admin",
    image: "",
    emailVerified: true,
    phoneVerified: Boolean(input.phone),
    disabled: false,
    sessionVersion: 0,
  });

  await adminUser.save();

  console.log(JSON.stringify(buildSummary("apply", "created-admin"), null, 2));
};

if (path.resolve(process.argv[1] || "") === __filename) {
  main()
    .catch((error) => {
      console.error("\nAdmin creation failed:", error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.connection.close().catch(() => {});
    });
}

export default main;
