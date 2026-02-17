import Review from "../models/reviewModel.js";
import Booking from "../models/bookingModel.js";

/**
 * 1. GET ALL REVIEWS
 * Fetches all public reviews with full details for the AllReviews.jsx feed.
 */
export const getAllReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ isHidden: false }) // Only show visible reviews
      .populate("userId", "firstName lastName image")
      .populate({
        path: "bookingId",
        select: "check_in check_out",
        populate: { path: "room_ids", select: "name" }, // Populates room names for the feed
      })
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (err) {
    next(err);
  }
};

/**
 * 2. CREATE OR UPDATE REVIEW
 * Uses findOneAndUpdate to handle both initial submissions and future edits.
 */

export const createReview = async (req, res, next) => {
  const { bookingId, rating, comment } = req.body;

  // Bridge the gap between authUser (req.userId) and verifyUser (req.user.id)
  const userId = req.userId || (req.user ? req.user.id : null);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized. Please login." });
  }

  try {
    // 1. Validate Booking ownership
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found!" });
    }

    if (booking.user_id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Security Alert: You can only review your own stays.",
      });
    }

    // 2. UPSERT LOGIC: Update existing or Create new
    // This allows the "Edit Review" button in the frontend to work correctly.
    const savedReview = await Review.findOneAndUpdate(
      { bookingId: bookingId }, 
      {
        userId,
        rating: Number(rating),
        comment,
        isHidden: false, // Reset visibility to visible if they update/fix their review
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 3. Sync the Booking record automatically (Backend Sync)
    // Marks the booking as rated and saves the review text for internal tracking/chat
    await Booking.findByIdAndUpdate(bookingId, {
      rating: Number(rating),
      review: comment,
    });

    res.status(200).json({
      success: true,
      message: "Review saved successfully",
      data: savedReview,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. ADMIN REPLY
 * Allows admins to respond to public reviews.
 */
export const replyToReview = async (req, res, next) => {
  try {
    const { response } = req.body;
    const { reviewId } = req.params;

    if (!response) {
      return res.status(400).json({ success: false, message: "Response content cannot be empty." });
    }

    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      { response: response },
      { new: true }
    ).populate("userId", "firstName lastName");

    if (!updatedReview) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    res.status(200).json({ success: true, message: "Reply posted", data: updatedReview });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. TOGGLE VISIBILITY
 * Allows admins to hide/show reviews from the public feed.
 */
export const toggleReviewVisibility = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);

    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    review.isHidden = !review.isHidden;
    await review.save();

    res.status(200).json({ 
      success: true, 
      message: `Review is now ${review.isHidden ? 'Hidden' : 'Visible'}` 
    });
  } catch (err) {
    next(err);
  }
};