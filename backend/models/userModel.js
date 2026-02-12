import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    middleName: { type: String, default: "" }, 
    lastName: { type: String, required: true },
    role: { type: String, default: 'user' },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: "0000000000" },
    password: { type: String, required: true },
    image: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
}, { 
    minimize: false, 
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true },
    timestamps: true // Correctly adds createdAt and updatedAt
});

// Virtual for full name
userSchema.virtual('name').get(function() {
    return this.middleName 
        ? `${this.firstName} ${this.middleName} ${this.lastName}` 
        : `${this.firstName} ${this.lastName}`;
});

// Fixed: Registered as "User" to match bookingModel ref
const userModel = mongoose.models.User || mongoose.model("User", userSchema); 
export default userModel;