import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking"
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

  reviewChat: [
    {
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        
      },
      senderRole: {
        type: String,
        enum: ["admin", "guest"],
        required: true
      },
      message: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  isHidden: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

export default mongoose.models.Review || mongoose.model("Review", reviewSchema);
