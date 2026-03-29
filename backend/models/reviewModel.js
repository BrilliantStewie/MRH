import mongoose from "mongoose";

const REVIEW_CHAT_OUTPUT_FIELDS = [
  "_id",
  "parentReplyId",
  "senderId",
  "senderRole",
  "message",
  "isEdited",
  "editHistory",
  "createdAt",
];

const buildOrderedReviewChatEntry = (value = {}) => {
  const orderedValue = {};

  REVIEW_CHAT_OUTPUT_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      orderedValue[field] = value[field];
    }
  });

  Object.keys(value).forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(orderedValue, field)) {
      orderedValue[field] = value[field];
    }
  });

  return orderedValue;
};

const reviewChatEditHistorySchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    message: { type: String, trim: true },
    editedAt: { type: Date, default: Date.now },
  },
  {
    _id: false,
  }
);

const reviewEditHistorySchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    rating: { type: Number },
    comment: { type: String, trim: true },
    editedAt: { type: Date, default: Date.now },
  },
  {
    _id: false,
  }
);

const reviewChatSchema = new mongoose.Schema(
  {
    parentReplyId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Optional for migrated legacy replies that never stored the sender document id.
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    senderRole: { type: String, enum: ["admin", "staff", "guest"], required: true },
    message: { type: String, required: true, trim: true },
    isEdited: { type: Boolean, default: false },
    editHistory: [reviewChatEditHistorySchema],
    createdAt: { type: Date, default: Date.now },
  },
  {
    _id: true,
    toJSON: {
      transform(_doc, ret) {
        return buildOrderedReviewChatEntry(ret);
      },
    },
    toObject: {
      transform(_doc, ret) {
        return buildOrderedReviewChatEntry(ret);
      },
    },
  }
);

const reviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    images: { type: [String], default: [] },

    reviewChat: [reviewChatSchema],
    editHistory: [reviewEditHistorySchema],

    isEdited: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ bookingId: 1 }, { unique: true });
reviewSchema.index({ userId: 1, createdAt: -1 });

reviewSchema.pre("save", function normalizeReviewChatOrder(next) {
  if (Array.isArray(this.reviewChat) && this.reviewChat.length > 0) {
    this.reviewChat = this.reviewChat.map((entry) =>
      buildOrderedReviewChatEntry(
        typeof entry?.toObject === "function" ? entry.toObject() : entry
      )
    );
  }

  next();
});

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;
