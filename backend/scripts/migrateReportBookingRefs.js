import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bookingModel from "../models/bookingModel.js";
import reportModel from "../models/reportModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const APPLY = process.argv.includes("--apply");

const getBookingReferenceDate = (booking) => {
  const parsed = new Date(booking?.checkIn);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const fetchBookingIdsWithinWindow = async (start, end) => {
  const bookings = await bookingModel
    .find({
      checkIn: {
        $gte: start,
        $lte: end,
      },
    })
    .select("_id checkIn")
    .lean();

  return bookings
    .filter((booking) => {
      const referenceDate = getBookingReferenceDate(booking);
      return referenceDate && referenceDate >= start && referenceDate <= end;
    })
    .map((booking) => booking._id);
};

const toIdStrings = (values) =>
  Array.isArray(values) ? values.map((value) => String(value)) : [];

const areIdArraysEqual = (left, right) => {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

const connect = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in backend/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI);
};

const main = async () => {
  await connect();

  const stats = {
    mode: APPLY ? "apply" : "dry-run",
    checked: 0,
    updatesNeeded: 0,
    updated: 0,
    totalSummaryMismatches: 0,
    samples: [],
  };

  for await (const report of reportModel
    .find({}, "_id label reportType periodYear periodMonth periodStart periodEnd totalBookings bookingIds")
    .cursor()) {
    stats.checked += 1;

    const bookingIds = await fetchBookingIdsWithinWindow(
      report.periodStart,
      report.periodEnd
    );
    const currentBookingIdStrings = toIdStrings(report.bookingIds);
    const nextBookingIdStrings = toIdStrings(bookingIds);

    if (Number(report.totalBookings || 0) !== nextBookingIdStrings.length) {
      stats.totalSummaryMismatches += 1;
    }

    if (areIdArraysEqual(currentBookingIdStrings, nextBookingIdStrings)) {
      continue;
    }

    stats.updatesNeeded += 1;

    if (stats.samples.length < 20) {
      stats.samples.push({
        reportId: String(report._id),
        label: report.label,
        currentBookingCount: currentBookingIdStrings.length,
        nextBookingCount: nextBookingIdStrings.length,
      });
    }

    if (APPLY) {
      await reportModel.updateOne(
        { _id: report._id },
        { $set: { bookingIds } }
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
