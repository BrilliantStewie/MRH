import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    middleName: { type: String, default: "" }, 
    lastName: { type: String, required: true },
    suffix: { type: String, default: "" },
    role: { type: String, default: 'guest' },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: "0000000000" },
    password: { type: String, required: true },
    image: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },

    // ✅ NEW FIELDS FOR OTP VERIFICATION
    isVerified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null }

}, { 
    minimize: false, 
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true },
    timestamps: true 
});

userSchema.virtual('name').get(function() {
    return this.middleName 
        ? `${this.firstName} ${this.middleName} ${this.lastName}` 
        : `${this.firstName} ${this.lastName}`;
});

const userModel = mongoose.models.User || mongoose.model("User", userSchema); 
export default userModel;