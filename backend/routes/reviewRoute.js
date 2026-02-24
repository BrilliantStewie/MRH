import express from "express";
import {
  createReview,
  getAllReviews,
  editReview,
  deleteReview,
  replyToReview,
  editReply,
  deleteReply,
  toggleReviewVisibility
} from "../controllers/reviewController.js";

import authUser from "../middlewares/authUser.js";

const reviewRouter = express.Router();

reviewRouter.get("/all-reviews", getAllReviews);

// Main Review Routes
reviewRouter.post("/", authUser, createReview);
reviewRouter.put("/:reviewId", authUser, editReview); // <-- NEW
reviewRouter.delete("/:reviewId", authUser, deleteReview); // <-- NEW

// Reply Routes
reviewRouter.post("/reply/:reviewId", authUser, replyToReview);
reviewRouter.put("/edit-reply/:replyId", authUser, editReply); // <-- UPDATED to match frontend
reviewRouter.delete("/delete-reply/:replyId", authUser, deleteReply); // <-- UPDATED to match frontend

export default reviewRouter;