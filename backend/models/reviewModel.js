import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  response: {
    type: String,
    default: null
  },
  isHidden: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true 
});

// Check if model exists before creating to prevent overwrite errors
const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;