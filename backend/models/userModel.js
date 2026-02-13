import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    middleName: { type: String, default: "" }, 
    lastName: { type: String, required: true },
    suffix: { type: String, default: "" }, // Ensure suffix is here if used in UI
    role: { type: String, default: 'user' },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: "0000000000" },
    password: { type: String, required: true },
    image: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 } 
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