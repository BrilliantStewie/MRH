import express from "express";
import {
  createReview,
  getAllReviews,
  getAllReviewsAdmin,
  editReview,
  deleteReview,
  replyToReview,
  editReply,
  deleteReply,
  toggleReviewVisibility
} from "../controllers/reviewController.js";

import authUser from "../middlewares/authUser.js";
import authAdmin from "../middlewares/authAdmin.js";
import upload from "../middlewares/multer.js";

const reviewRouter = express.Router();

/* ===========================
   PUBLIC ROUTES
=========================== */

// Anyone can view reviews
reviewRouter.get("/all-reviews", getAllReviews);
reviewRouter.get("/admin/all-reviews", authAdmin, getAllReviewsAdmin);
reviewRouter.patch("/toggle/:reviewId", authAdmin, toggleReviewVisibility);


/* ===========================
   PROTECTED ROUTES (LOGGED IN USERS)
=========================== */

// Apply authUser middleware to everything below
reviewRouter.use(authUser);

/* -------- MAIN REVIEW -------- */

// Guest creates a review
reviewRouter.post("/", upload.array("images", 6), createReview);

// Guest edits their review
reviewRouter.put("/:reviewId", upload.array("images", 6), editReview);

// Guest deletes their review
reviewRouter.delete("/:reviewId", deleteReview);


/* -------- REPLIES -------- */

// Any logged-in user can reply
reviewRouter.post("/reply/:reviewId", replyToReview);

// Edit reply
reviewRouter.put("/edit-reply/:replyId", editReply);
reviewRouter.put("/reply/:reviewId/:replyId", editReply);

// Delete reply
reviewRouter.delete("/delete-reply/:replyId", deleteReply);
reviewRouter.delete("/reply/:reviewId/:replyId", deleteReply);


export default reviewRouter;
