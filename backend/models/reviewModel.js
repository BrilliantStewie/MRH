import mongoose from "mongoose";

const reviewChatSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    senderRole: {
      type: String,
      enum: ["admin", "staff", "guest"],
      required: true
    },

    message: {
      type: String,
      required: true,
      trim: true
    },

    // 🚀 NEW: Links a reply to a specific Admin/Staff comment
    // If null, it's a top-level response to the main review.
    parentReplyId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    // Edit history for replies
    editHistory: [
      {
        message: {
          type: String,
          trim: true
        },
        editedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    isEdited: {
      type: Boolean,
      default: false
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const reviewSchema = new mongoose.Schema(
  {
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

    // Store edit history for the main review
    editHistory: [
      {
        rating: { 
          type: Number
        },
        comment: {
          type: String,
          trim: true
        },
        editedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    isEdited: {
      type: Boolean,
      default: false
    },

    reviewChat: [reviewChatSchema],

    isHidden: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", reviewSchema);

export default Review;