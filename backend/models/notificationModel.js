import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  type: {
    type: String,
    // ✅ Updated Enum: Added booking and payment types
    enum: [
      "new_review", 
      "new_reply", 
      "review_hidden", 
      "booking_update", 
      "payment_update"
    ],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  link: {
    type: String // URL to redirect the user (e.g., /my-bookings or /admin/reviews)
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;