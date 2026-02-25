import Review from "../models/reviewModel.js";
import Booking from "../models/bookingModel.js";
import Notification from "../models/notificationModel.js";

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
          editedAt: new Date() // The exact time this old version was replaced
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

    // 🔔 NOTIFY ADMINS: New Review Submitted
    const admins = await Booking.db.model("User").find({ role: "admin" });
    const adminNotifications = admins.map((admin) => ({
      recipient: admin._id,
      sender: userId,
      type: "new_review",
      message: `A guest just left a ${rating}-star review for their stay.`,
      link: "/admin/reviews", // Or wherever your admin reviews page is
      isRead: false
    }));

    if (adminNotifications.length > 0) {
      await Notification.insertMany(adminNotifications);
    }

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
   🟢 NEW: EDIT MAIN REVIEW DIRECTLY (Guest Only)
============================================================ */
export const editReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { comment, rating } = req.body; // <-- EXTRACTING RATING HERE
    const userId = req.userId;

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ success: false, message: "Review not found." });

    // 🔐 STRICT OWNERSHIP CHECK
    if (review.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized. You can only edit your own review." });
    }

    // Save previous state to history
    review.editHistory.push({
      rating: review.rating,
      comment: review.comment,
      editedAt: new Date()
    });

    // UPDATE COMMENT AND RATING
    review.comment = comment;
    if (rating) {
      review.rating = Number(rating); // <-- UPDATE RATING
    }
    review.isEdited = true;

    await review.save();

    // Sync with Booking model
    if (review.bookingId) {
      const updateData = { review: comment };
      if (rating) updateData.rating = Number(rating); // <-- SYNC RATING TO BOOKING
      
      await Booking.findByIdAndUpdate(review.bookingId, updateData);
    }

    res.status(200).json({ success: true, message: "Review updated successfully." });
  } catch (err) {
    next(err);
  }
};

/* ============================================================
   🟢 NEW: DELETE MAIN REVIEW (Guest Only)
============================================================ */
export const deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.userId;

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ success: false, message: "Review not found." });

    // 🔐 STRICT OWNERSHIP CHECK
    if (review.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized. You can only delete your own review." });
    }

    await Review.findByIdAndDelete(reviewId);

    // Optional: Clear review fields from associated booking if deleted
    if (review.bookingId) {
      await Booking.findByIdAndUpdate(review.bookingId, { review: "", rating: null });
    }

    res.status(200).json({ success: true, message: "Review deleted successfully." });
  } catch (err) {
    next(err);
  }
};


/* ============================================================
   3️⃣ ADD REPLY (Admin, Staff, Guest)
============================================================ */
export const replyToReview = async (req, res, next) => {
  try {
    const { response, parentReplyId } = req.body; 
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
      parentReplyId: parentReplyId || null 
    });

    await review.save();

    // 🔔 NOTIFICATION LOGIC FOR REPLIES
    if (role !== "guest") {
      // If Admin/Staff replied, notify the guest
      await Notification.create({
        recipient: review.userId,
        sender: userId,
        type: "new_reply",
        message: `Management has replied to your review.`,
        link: "/my-bookings", 
        isRead: false
      });
    } else {
      // If Guest replied, notify the admins
      const admins = await Booking.db.model("User").find({ role: "admin" });
      const adminNotifications = admins.map((admin) => ({
        recipient: admin._id,
        sender: userId,
        type: "new_reply",
        message: `A guest replied to a review thread.`,
        link: "/admin/reviews",
        isRead: false
      }));
      if (adminNotifications.length > 0) {
        await Notification.insertMany(adminNotifications);
      }
    }

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
    const { replyId } = req.params; // Using the streamlined route parameters
    const { message } = req.body;
    const userId = req.userId;

    // Find the parent review that contains this specific reply
    const review = await Review.findOne({ "reviewChat._id": replyId });
    if (!review) return res.status(404).json({ success: false, message: "Reply not found." });

    const reply = review.reviewChat.id(replyId);

    // 🔐 STRICT OWNERSHIP CHECK
    if (reply.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized. You can only edit your own replies." });
    }

    reply.editHistory.push({ 
      message: reply.message, 
      editedAt: new Date() // The exact time this old version was replaced
    });
    
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
    const { replyId } = req.params; // Using the streamlined route parameters
    const userId = req.userId;

    // Find the parent review that contains this specific reply
    const review = await Review.findOne({ "reviewChat._id": replyId });
    if (!review) return res.status(404).json({ success: false, message: "Reply not found." });

    const reply = review.reviewChat.id(replyId);

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

    // 🔔 NOTIFY GUEST: Review Hidden
    if (review.isHidden) {
      await Notification.create({
        recipient: review.userId,
        type: "review_hidden",
        message: `Your review has been hidden by moderation.`,
        link: "/my-bookings",
        isRead: false
      });
    }

    res.status(200).json({
      success: true,
      message: `Review is now ${review.isHidden ? "Hidden" : "Visible"}`
    });

  } catch (err) {
    next(err);
  }
};