import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  middleName: { type: String, default: "" },
  lastName: { 
    type: String, 
    required: function () { 
      return this.authProvider !== "google"; 
    } 
  },
  suffix: { type: String, default: "" },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  passwordSet: { type: Boolean, default: false },
  role: { type: String, enum: ["guest", "staff", "admin"], default: "guest"},
  disabled: { type: Boolean, default: false },
  phone: { type: String, default: null },
  image: { type: String, default: "" },
  tokenVersion: { type: Number, default: 0 },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  authProvider: { type: String, enum: ["local", "google"], default: "local" },
  pendingPhone: { type: String, default: "" },
  pendingEmail: { type: String, default: "" },
  phoneVerified: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false }
}, { minimize: false, toJSON: { virtuals: true }, toObject: { virtuals: true }, timestamps: true });

userSchema.virtual("name").get(function () {
  return this.middleName ? `${this.firstName} ${this.middleName} ${this.lastName}` : `${this.firstName} ${this.lastName}`;
});

userSchema.pre("save", function (next) {
  if (typeof this.emailVerified === "undefined") {
    this.emailVerified =
      this.authProvider === "google" ||
      ["admin", "staff"].includes(this.role);
  }
  next();
});

const userModel = mongoose.models.User || mongoose.model("User", userSchema);

export default userModel;
