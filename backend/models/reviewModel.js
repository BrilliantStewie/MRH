import mongoose from "mongoose";

const reviewChatSchema = new mongoose.Schema(
  {
    // Optional for migrated legacy replies that never stored the sender document id.
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    senderRole: { type: String, enum: ["admin", "staff", "guest"], required: true },
    message: { type: String, required: true, trim: true },
    parentReplyId: { type: mongoose.Schema.Types.ObjectId, default: null },
    isEdited: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    editHistory: [
      {
        message: { type: String, trim: true },
        editedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: true }
);

const reviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    images: { type: [String], default: [] },
    isHidden: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    reviewChat: [reviewChatSchema],
    editHistory: [
      {
        rating: { type: Number },
        comment: { type: String, trim: true },
        editedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ bookingId: 1 }, { unique: true });
reviewSchema.index({ userId: 1, createdAt: -1 });

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;
