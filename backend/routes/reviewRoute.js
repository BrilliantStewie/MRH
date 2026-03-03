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
=========================== */

// 🔥 Allow admin OR guest to reply
reviewRouter.post(
  "/reply/:reviewId",
  (req, res, next) => {
    authAdmin(req, res, (err) => {
      if (!err) return next(); // admin/staff authenticated
      authUser(req, res, next); // fallback to guest
    });
  },
  replyToReview
);

// 🔥 Allow editing own reply (admin or guest)
reviewRouter.put(
  "/edit-reply/:replyId",
  (req, res, next) => {
    authAdmin(req, res, (err) => {
      if (!err) return next();
      authUser(req, res, next);
    });
  },
  editReply
);

// 🔥 Allow deleting own reply (admin or guest)
reviewRouter.delete(
  "/delete-reply/:replyId",
  (req, res, next) => {
    authAdmin(req, res, (err) => {
      if (!err) return next();
      authUser(req, res, next);
    });
  },
  deleteReply
);

export default reviewRouter;