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
import authAdmin from "../middlewares/authAdmin.js";

const reviewRouter = express.Router();

/* ===========================
   PUBLIC
=========================== */
reviewRouter.get("/all-reviews", getAllReviews);

/* ===========================
   GUEST ONLY (Main Review)
=========================== */
reviewRouter.post("/", authUser, createReview);
reviewRouter.put("/:reviewId", authUser, editReview);
reviewRouter.delete("/:reviewId", authUser, deleteReview);

/* ===========================
   REPLIES (ADMIN OR GUEST)
   ✅ Any logged-in user can reply/edit/delete
=========================== */

reviewRouter.post("/reply/:reviewId", authUser, replyToReview);
reviewRouter.put("/edit-reply/:replyId", authUser, editReply);
reviewRouter.delete("/delete-reply/:replyId", authUser, deleteReply);

/* ===========================
   ADMIN ONLY (Visibility Toggle)
=========================== */

reviewRouter.patch("/toggle/:reviewId", authAdmin, toggleReviewVisibility);

export default reviewRouter;