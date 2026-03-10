import Review from "../models/reviewModel.js";
import Booking from "../models/bookingModel.js";
import Notification from "../models/notificationModel.js";
import sendEmail from "../utils/sendEmail.js";

/* ============================================================
   1️⃣ GET ALL REVIEWS
============================================================ */
export const getAllReviews = async (req, res) => {
  try {

    const reviews = await Review.find({ isHidden: false })
      .populate("userId", "firstName middleName lastName image")
      .populate({
        path: "reviewChat.senderId",
        select: "firstName middleName lastName image",
        options: { strictPopulate: false }
      })
      .populate("bookingId", "check_in check_out bookingName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      reviews
    });

  } catch (err) {
    console.error("GET ALL REVIEWS ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/* ============================================================
   2️⃣ CREATE OR UPDATE REVIEW
============================================================ */
export const createReview = async (req, res) => {

  const { bookingId, rating, comment } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please login."
    });
  }

  try {

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found."
      });
    }

    if (booking.user_id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only review your own stay."
      });
    }

    const existingReview = await Review.findOne({ bookingId });

    if (existingReview) {

      const isChanged =
        existingReview.rating !== Number(rating) ||
        existingReview.comment !== comment;

      if (isChanged) {

        existingReview.editHistory.push({
          rating: existingReview.rating,
          comment: existingReview.comment,
          editedAt: new Date()
        });

        existingReview.rating = Number(rating);
        existingReview.comment = comment;
        existingReview.isEdited = true;
        existingReview.isHidden = false;

        await existingReview.save();

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

      return res.status(200).json({
        success: true,
        message: "No changes detected",
        data: existingReview
      });
    }

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

    const admins = await Booking.db.model("User").find({ role: "admin" });

    const adminNotifications = admins.map((admin) => ({
      recipient: admin._id,
      sender: userId,
      type: "new_review",
      message: `A guest left a ${rating}-star review.`,
      link: "/admin/reviews",
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
    console.error("CREATE REVIEW ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/* ============================================================
   3️⃣ EDIT REVIEW
============================================================ */
export const editReview = async (req, res) => {
  try {

    const { reviewId } = req.params;
    const { comment, rating } = req.body;
    const userId = req.userId;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found."
      });
    }

    if (review.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized."
      });
    }

    review.editHistory.push({
      rating: review.rating,
      comment: review.comment,
      editedAt: new Date()
    });

    review.comment = comment;

    if (rating) {
      review.rating = Number(rating);
    }

    review.isEdited = true;

    await review.save();

    if (review.bookingId) {
      const updateData = { review: comment };
      if (rating) updateData.rating = Number(rating);

      await Booking.findByIdAndUpdate(review.bookingId, updateData);
    }

    res.status(200).json({
      success: true,
      message: "Review updated successfully."
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/* ============================================================
   4️⃣ DELETE REVIEW
============================================================ */
export const deleteReview = async (req, res) => {
  try {

    const { reviewId } = req.params;
    const userId = req.userId;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found."
      });
    }

    if (review.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized."
      });
    }

    await Review.findByIdAndDelete(reviewId);

    if (review.bookingId) {
      await Booking.findByIdAndUpdate(review.bookingId, {
        review: "",
        rating: null
      });
    }

    res.status(200).json({
      success: true,
      message: "Review deleted successfully."
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/* ============================================================
   5️⃣ REPLY TO REVIEW
============================================================ */
export const replyToReview = async (req, res) => {
  try {

    const { response, parentReplyId } = req.body;
    const { reviewId } = req.params;

    const userId = req.userId;

    // SAFE ROLE FALLBACK
    const role = req.userRole || "admin";

    if (!response || !response.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply cannot be empty."
      });
    }

    const review = await Review.findById(reviewId)
      .populate("userId", "firstName email");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found."
      });
    }

    // Only restrict guests
if (req.userRole === "guest") {

  if (review.userId._id.toString() !== req.userId.toString()) {
    return res.status(403).json({
      success: false,
      message: "Guests can only reply to their own reviews."
    });
  }

}

    review.reviewChat.push({
      senderId: userId,
      senderRole: role,
      message: response,
      parentReplyId: parentReplyId || null
    });

    await review.save();

    if (role !== "guest") {

      await Notification.create({
        recipient: review.userId._id,
        sender: userId,
        type: "new_reply",
        message: "Management replied to your review.",
        link: "/my-bookings",
        isRead: false
      });

      await sendEmail(
        review.userId.email,
        "Response to Your Review – Mercedarian Retreat House",
        `
        <p>Dear ${review.userId.firstName},</p>
        <p>Our management team has responded to your review.</p>

        <blockquote style="border-left:3px solid #ccc;padding-left:10px;color:#555;">
        ${response}
        </blockquote>

        <p>You may login to continue the conversation.</p>
        `
      );

    } else {

      const admins = await Booking.db.model("User")
        .find({ role: "admin" })
        .select("email firstName");

      const adminNotifications = admins.map((admin) => ({
        recipient: admin._id,
        sender: userId,
        type: "new_reply",
        message: "A guest replied to a review thread.",
        link: "/admin/reviews",
        isRead: false
      }));

      if (adminNotifications.length > 0) {
        await Notification.insertMany(adminNotifications);
      }
    }

    res.status(200).json({
      success: true,
      message: "Reply added successfully."
    });

  } catch (err) {
    console.error("REPLY ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/* ============================================================
   6️⃣ EDIT REPLY
============================================================ */
export const editReply = async (req, res) => {
  try {

    const { replyId } = req.params;
    const { message } = req.body;
    const userId = req.userId;

    const review = await Review.findOne({ "reviewChat._id": replyId });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Reply not found."
      });
    }

    const reply = review.reviewChat.id(replyId);

    if (reply.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized."
      });
    }

    reply.editHistory.push({
      message: reply.message,
      editedAt: new Date()
    });

    reply.message = message;
    reply.isEdited = true;

    await review.save();

    res.status(200).json({
      success: true,
      message: "Reply updated."
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/* ============================================================
   7️⃣ DELETE REPLY
============================================================ */
export const deleteReply = async (req, res) => {
  try {

    const { replyId } = req.params;
    const userId = req.userId;

    const review = await Review.findOne({ "reviewChat._id": replyId });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Reply not found."
      });
    }

    const reply = review.reviewChat.id(replyId);

    if (reply.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized."
      });
    }

    review.reviewChat.pull(replyId);

    await review.save();

    res.status(200).json({
      success: true,
      message: "Reply deleted."
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/* ============================================================
   8️⃣ TOGGLE REVIEW VISIBILITY
============================================================ */
export const toggleReviewVisibility = async (req, res) => {
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

    if (review.isHidden) {
      await Notification.create({
        recipient: review.userId,
        type: "review_hidden",
        message: "Your review has been hidden by moderation.",
        link: "/my-bookings",
        isRead: false
      });
    }

    res.status(200).json({
      success: true,
      message: `Review is now ${review.isHidden ? "Hidden" : "Visible"}`
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};