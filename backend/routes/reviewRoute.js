import express from "express";
import {
  createReview,
  getAllReviews,
  replyToReview,
  editReply,
  deleteReply
} from "../controllers/reviewController.js";

import authUser from "../middlewares/authUser.js";

const reviewRouter = express.Router();

reviewRouter.get("/all-reviews", getAllReviews);

reviewRouter.post("/", authUser, createReview);

reviewRouter.post("/reply/:reviewId", authUser, replyToReview);

reviewRouter.put("/reply/:reviewId/:replyId", authUser, editReply);

reviewRouter.delete("/reply/:reviewId/:replyId", authUser, deleteReply);

export default reviewRouter;
