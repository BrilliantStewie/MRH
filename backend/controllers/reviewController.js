import Review from "../models/reviewModel.js";
import Booking from "../models/bookingModel.js";

/* ============================================================
   1️⃣ GET ALL REVIEWS (Public)
============================================================ */
export const getAllReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ isHidden: false })
      .populate("userId", "firstName middleName lastName image")
      .populate("reviewChat.senderId", "firstName middleName lastName image") 
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

    // 1. Find existing review to check for changes
    const existingReview = await Review.findOne({ bookingId });

    if (existingReview) {
      // 2. Check if the rating or comment has actually changed
      const isChanged = existingReview.rating !== Number(rating) || existingReview.comment !== comment;

      if (isChanged) {
        // 3. Push old content to edit history
        existingReview.editHistory.push({
          rating: existingReview.rating,
          comment: existingReview.comment,
          editedAt: new Date()
        });

        // 4. Update the current fields
        existingReview.rating = Number(rating);
        existingReview.comment = comment;
        existingReview.isEdited = true;
        existingReview.isHidden = false;

        await existingReview.save();

        // Sync with Booking model
        await Booking.findByIdAndUpdate(bookingId, {
          rating: Number(rating),
          review: comment
        });

        return res.status(200).json({
          success: true,
          message: "Review updated with history",
          data: existingReview
        });
      }

      // If no changes, just return the existing review
      return res.status(200).json({
        success: true,
        message: "No changes detected",
        data: existingReview
      });
    }

    // 5. Create new review if it doesn't exist (initial review)
    const newReview = new Review({
      bookingId,
      userId,
      rating: Number(rating),
      comment,
      isHidden: false
    });

    await newReview.save();

    await Booking.findByIdAndUpdate(bookingId, {
      rating: Number(rating),
      review: comment
    });

    res.status(200).json({
      success: true,
      message: "Review created successfully",
      data: newReview
    });

  } catch (err) {
    next(err);
  }
};


/* ============================================================
   3️⃣ ADD REPLY (Admin, Staff, Guest)
============================================================ */
export const replyToReview = async (req, res, next) => {
  try {
    const { response, parentReplyId } = req.body; // Add parentReplyId here
    const { reviewId } = req.params;
    const userId = req.userId;
    const role = req.userRole;

    if (!response?.trim()) {
      return res.status(400).json({ success: false, message: "Reply cannot be empty." });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    // GUEST SECURITY: Guests only reply to their own review thread
    if (role === "guest" && review.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    // Add the message with the parent reference
    review.reviewChat.push({
      senderId: userId,
      senderRole: role,
      message: response,
      parentReplyId: parentReplyId || null // Link to the specific comment
    });

    await review.save();
    res.status(200).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
};

/* ============================================================
   4️⃣ EDIT REPLY (Strictly Own Replies Only)
============================================================ */
export const editReply = async (req, res) => {
  try {
    const { reviewId, replyId } = req.params;
    const { message } = req.body;
    const userId = req.userId;

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ success: false, message: "Review not found." });

    const reply = review.reviewChat.id(replyId);
    if (!reply) return res.status(404).json({ success: false, message: "Reply not found." });

    // 🔐 STRICT OWNERSHIP CHECK
    if (reply.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized. You can only edit your own replies." });
    }

    reply.editHistory.push({ message: reply.message, editedAt: new Date() });
    reply.message = message;
    reply.isEdited = true;

    await review.save();

    return res.status(200).json({ success: true, message: "Reply updated successfully." });

  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error while editing reply." });
  }
};

/* ============================================================
   5️⃣ DELETE REPLY (Strictly Own Replies Only)
============================================================ */
export const deleteReply = async (req, res) => {
  try {
    const { reviewId, replyId } = req.params;
    const userId = req.userId;

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ success: false, message: "Review not found." });

    const reply = review.reviewChat.id(replyId);
    if (!reply) return res.status(404).json({ success: false, message: "Reply not found." });

    // 🔐 STRICT OWNERSHIP CHECK
    if (reply.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized. You can only delete your own replies." });
    }

    review.reviewChat.pull(replyId);
    await review.save();

    res.json({ success: true, message: "Reply deleted successfully." });

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