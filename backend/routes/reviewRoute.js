import express from "express";
import { createReview, getAllReviews } from "../controllers/reviewController.js";
import authUser from "../middlewares/authUser.js"; // Use your existing auth middleware

const reviewRouter = express.Router();

// This allows: axios.get('/api/reviews')
reviewRouter.get("/all-reviews", getAllReviews);

// This allows: axios.post('/api/reviews') 
// Note: We use "/" because the prefix in server.js is likely "/api/reviews"
reviewRouter.post("/", authUser, createReview);

export default reviewRouter;