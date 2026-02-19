import Review from "../models/reviewModel.js";
import Booking from "../models/bookingModel.js";

/* ============================================================
   1️⃣ GET ALL REVIEWS (Public)
============================================================ */
export const getAllReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ isHidden: false })
      .populate("userId", "firstName lastName image")
      .populate({
        path: "bookingId",
        select: "check_in check_out bookingName room_ids",
        populate: { path: "room_ids", select: "name" }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      reviews
    });

  } catch (err) {
    next(err);
  }
};


/* ============================================================
   2️⃣ CREATE OR UPDATE REVIEW (Guest Only)
============================================================ */
export const createReview = async (req, res, next) => {
  const { bookingId, rating, comment } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please login."
    });
  }

  try {
    // Validate booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found."
      });
    }

    // Validate ownership
    if (booking.user_id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only review your own stay."
      });
    }

    const savedReview = await Review.findOneAndUpdate(
      { bookingId },
      {
        userId,
        rating: Number(rating),
        comment,
        isHidden: false
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Booking.findByIdAndUpdate(bookingId, {
      rating: Number(rating),
      review: comment
    });

    res.status(200).json({
      success: true,
      message: "Review saved successfully",
      data: savedReview
    });

  } catch (err) {
    next(err);
  }
};


/* ============================================================
   3️⃣ ADD REPLY (Admin + Guest)
============================================================ */
export const replyToReview = async (req, res, next) => {
  try {
    const { response } = req.body;
    const { reviewId } = req.params;

    const userId = req.userId;
    const role = req.userRole;

    if (!response || response.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Reply cannot be empty."
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found."
      });
    }

    // 🔐 SECURITY
    if (role === "guest" && review.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only reply to your own review."
      });
    }

    review.reviewChat.push({
      senderId: userId,
      senderRole: role, // admin | staff | guest
      message: response
    });

    await review.save();

    res.status(200).json({
      success: true,
      message: "Reply added successfully",
      data: review
    });

  } catch (err) {
    next(err);
  }
};


/* ============================================================
   4️⃣ EDIT REPLY
============================================================ */
export const editReply = async (req, res) => {
  try {
    const { reviewId, replyId } = req.params;
    const { message } = req.body;

    const userId = req.userId;
    const role = req.userRole;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found."
      });
    }

    const reply = review.reviewChat.id(replyId);
    if (!reply) {
      return res.status(404).json({
        success: false,
        message: "Reply not found."
      });
    }

    // 🔐 Permission check
    if (
      role !== "admin" &&
      role !== "staff" &&
      reply.senderId.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized edit."
      });
    }

    reply.message = message;
    reply.isEdited = true;

    await review.save();

    return res.status(200).json({
      success: true,
      message: "Reply updated successfully."
    });

  } catch (err) {
    console.error("Edit Reply Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while editing reply."
    });
  }
};



/* ============================================================
   5️⃣ DELETE REPLY
============================================================ */
export const deleteReply = async (req, res) => {
  try {
    const { reviewId, replyId } = req.params;

    const userId = req.userId;
    const role = req.userRole;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    const reply = review.reviewChat.id(replyId);
    if (!reply) {
      return res.status(404).json({ success: false, message: "Reply not found." });
    }

    // ✅ Admin OR Staff OR Original Sender
    if (
      role !== "admin" &&
      role !== "staff" &&
      reply.senderId.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized delete."
      });
    }

    review.reviewChat.pull(replyId);
await review.save();


    res.json({
      success: true,
      message: "Reply deleted successfully."
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


/* ============================================================
   6️⃣ TOGGLE VISIBILITY (Admin Only)
============================================================ */
export const toggleReviewVisibility = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found."
      });
    }

    review.isHidden = !review.isHidden;
    await review.save();

    res.status(200).json({
      success: true,
      message: `Review is now ${review.isHidden ? "Hidden" : "Visible"}`
    });

  } catch (err) {
    next(err);
  }
};
