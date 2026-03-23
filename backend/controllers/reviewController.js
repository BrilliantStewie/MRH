import Review from "../models/reviewModel.js";
import Booking from "../models/bookingModel.js";
import cloudinary from "../config/cloudinary.js";
import sendEmail from "../utils/sendEmail.js";
import {
  createOrRefreshNotification,
  createOrRefreshNotifications,
} from "../utils/notificationUtils.js";
import {
  packageReferencePopulate,
  roomReferencePopulate,
  serializeReview,
} from "../utils/dataConsistency.js";

const uploadReviewImage = (fileBuffer, folder = "mrh_reviews") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });

const normalizeImageList = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const sanitizeImageList = (list) =>
  Array.isArray(list)
    ? list.filter((img) => typeof img === "string" && img.trim())
    : [];

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
      .populate({
        path: "bookingId",
        select: "checkIn checkOut bookingName bookingItems extraPackages venueParticipants totalPrice status paymentStatus",
        populate: [
          {
            path: "bookingItems.roomId",
            populate: roomReferencePopulate
          },
          {
            path: "bookingItems.packageId",
            populate: packageReferencePopulate
          },
          {
            path: "extraPackages",
            populate: packageReferencePopulate
          }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      reviews: reviews.map((review) => serializeReview(review))
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
  const imageFiles = Array.isArray(req.files) ? req.files : [];

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

    if (booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only review your own stay."
      });
    }

    if (imageFiles.length > 6) {
      return res.status(400).json({
        success: false,
        message: "You can upload up to 6 images per review."
      });
    }

    const validImageFiles = imageFiles.filter(
      (file) => file?.buffer && file.buffer.length > 0
    );
    const uploadedImages = await Promise.all(
      validImageFiles.map((file) => uploadReviewImage(file.buffer))
    );

    const existingReview = await Review.findOne({ bookingId });

    if (existingReview) {

      const providedExistingImages = normalizeImageList(req.body.existingImages);
      const baseImages = Array.isArray(providedExistingImages)
        ? sanitizeImageList(providedExistingImages)
        : sanitizeImageList(existingReview.images || []);
      const finalImages = [...baseImages, ...uploadedImages];

      if (finalImages.length > 6) {
        return res.status(400).json({
          success: false,
          message: "You can upload up to 6 images per review."
        });
      }

      const imagesChanged =
        uploadedImages.length > 0 ||
        (Array.isArray(providedExistingImages) &&
          JSON.stringify(baseImages) !==
            JSON.stringify(sanitizeImageList(existingReview.images || [])));

      const isChanged =
        existingReview.rating !== Number(rating) ||
        existingReview.comment !== comment ||
        imagesChanged;

      if (isChanged) {

        existingReview.editHistory.push({
          rating: existingReview.rating,
          comment: existingReview.comment,
          editedAt: new Date()
        });

        existingReview.rating = Number(rating);
        existingReview.comment = comment;
        if (imagesChanged) {
          existingReview.images = finalImages;
        }
        existingReview.isEdited = true;
        existingReview.isHidden = false;

        await existingReview.save();

        return res.status(200).json({
          success: true,
          message: "Review updated with history",
          data: serializeReview(existingReview)
        });
      }

      return res.status(200).json({
        success: true,
        message: "No changes detected",
        data: serializeReview(existingReview)
      });
    }

    const newReview = new Review({
      bookingId,
      userId,
      rating: Number(rating),
      comment,
      images: uploadedImages,
      isHidden: false
    });

    await newReview.save();

    const recipients = await Booking.db.model("User").find({ role: { $in: ["admin", "staff"] } });

    const adminNotifications = recipients.map((user) => ({
      recipient: user._id,
      sender: userId,
      type: "new_review",
      message: `New ${rating}-star review received.`,
      link: `/admin/reviews?reviewId=${newReview._id}`,
      isRead: false
    }));

    if (adminNotifications.length > 0) {
      await createOrRefreshNotifications(adminNotifications);
    }

    res.status(200).json({
      success: true,
      message: "Review created successfully",
      data: serializeReview(newReview)
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
    const imageFiles = Array.isArray(req.files) ? req.files : [];

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

    if (imageFiles.length > 6) {
      return res.status(400).json({
        success: false,
        message: "You can upload up to 6 images per review."
      });
    }

    const validImageFiles = imageFiles.filter(
      (file) => file?.buffer && file.buffer.length > 0
    );
    const uploadedImages = await Promise.all(
      validImageFiles.map((file) => uploadReviewImage(file.buffer))
    );

    const providedExistingImages = normalizeImageList(req.body.existingImages);
    const baseImages = Array.isArray(providedExistingImages)
      ? sanitizeImageList(providedExistingImages)
      : sanitizeImageList(review.images || []);
    const finalImages = [...baseImages, ...uploadedImages];

    if (finalImages.length > 6) {
      return res.status(400).json({
        success: false,
        message: "You can upload up to 6 images per review."
      });
    }

    const imagesChanged =
      JSON.stringify(finalImages) !==
      JSON.stringify(sanitizeImageList(review.images || []));

    review.editHistory.push({
      rating: review.rating,
      comment: review.comment,
      editedAt: new Date()
    });

    if (typeof comment !== "undefined") {
      review.comment = comment;
    }

    if (rating) {
      review.rating = Number(rating);
    }

    if (imagesChanged) {
      review.images = finalImages;
    }

    review.isEdited = true;

    await review.save();

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
    const createdReply = review.reviewChat[review.reviewChat.length - 1];

    await review.save();

    if (role !== "guest") {
      const reviewLink = createdReply?._id
        ? `/reviews?reviewId=${reviewId}&replyId=${createdReply._id}`
        : "/reviews";
      await createOrRefreshNotification({
        recipient: review.userId._id,
        sender: userId,
        type: "new_reply",
        message: "Reply added to your review.",
        link: reviewLink,
        isRead: false
      });

      await sendEmail(
        review.userId.email,
        "Review reply - Mercedarian Retreat House",
        `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
          <p>Hello ${review.userId.firstName},</p>
          <p>We added a reply to your review.</p>
          <div style="margin: 12px 0; padding: 10px 12px; border-left: 3px solid #e2e8f0; color: #334155;">
            ${response}
          </div>
          <p>Sign in to view or respond.</p>
          <p>Mercedarian Retreat House</p>
        </div>
        `
      );

    } else {

      const recipients = await Booking.db.model("User")
        .find({ role: { $in: ["admin", "staff"] } })
        .select("email firstName");

      const adminReviewLink = createdReply?._id
        ? `/admin/reviews?reviewId=${reviewId}&replyId=${createdReply._id}`
        : `/admin/reviews?reviewId=${reviewId}`;

      const adminNotifications = recipients.map((user) => ({
        recipient: user._id,
        sender: userId,
        type: "new_reply",
        message: "Guest replied to a review.",
        link: adminReviewLink,
        isRead: false
      }));

      if (adminNotifications.length > 0) {
        await createOrRefreshNotifications(adminNotifications);
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

    if (!reply.senderId || reply.senderId.toString() !== userId.toString()) {
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

    if (!reply.senderId || reply.senderId.toString() !== userId.toString()) {
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
      await createOrRefreshNotification({
        recipient: review.userId,
        type: "review_hidden",
        message: "Review hidden by moderation.",
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
