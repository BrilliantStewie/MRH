import mongoose from "mongoose";

const contactVerificationSchema = new mongoose.Schema(
  {
    purpose: { type: String, required: true, trim: true },
    target: { type: String, required: true, trim: true },
    otp: { type: String, required: true, trim: true },
    expiresAt: { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

contactVerificationSchema.index(
  { purpose: 1, target: 1 },
  { unique: true, name: "contact_verification_purpose_target_unique" }
);

contactVerificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "contact_verification_expires_at_ttl" }
);

const contactVerificationModel =
  mongoose.models.ContactVerification ||
  mongoose.model("ContactVerification", contactVerificationSchema);

export default contactVerificationModel;
