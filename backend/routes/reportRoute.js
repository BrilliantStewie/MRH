import express from "express";
import authAdmin from "../middlewares/authAdmin.js";
import {
  generateReport,
  getReportData,
  listReports,
} from "../controllers/reportController.js";

const reportRouter = express.Router();

reportRouter.get("/report", authAdmin, getReportData);
reportRouter.get("/reports", authAdmin, listReports);
reportRouter.post("/reports/generate", authAdmin, generateReport);

export default reportRouter;
