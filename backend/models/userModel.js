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
  phone: { type: String, default: null },
  image: { type: String, default: "" },
  authProvider: { type: String, enum: ["local", "google"], default: "local" },
  password: { type: String, required: true },
  passwordSet: { type: Boolean, default: false },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  role: { type: String, enum: ["guest", "staff", "admin"], default: "guest"},
  disabled: { type: Boolean, default: false },
  pendingEmail: { type: String, default: "" },
  pendingPhone: { type: String, default: "" },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  sessionVersion: { type: Number, default: 0 },
  tokenVersion: { type: Number, default: 0 }
}, { minimize: false, toJSON: { virtuals: true }, toObject: { virtuals: true }, timestamps: true });

userSchema.virtual("name").get(function () {
  return this.middleName ? `${this.firstName} ${this.middleName} ${this.lastName}` : `${this.firstName} ${this.lastName}`;
});

userSchema.pre("save", function (next) {
  if (
    (this.sessionVersion === null || typeof this.sessionVersion === "undefined") &&
    typeof this.tokenVersion !== "undefined"
  ) {
    this.sessionVersion = this.tokenVersion;
  }

  this.tokenVersion = this.sessionVersion || 0;

  if (typeof this.emailVerified === "undefined") {
    this.emailVerified =
      this.authProvider === "google" ||
      ["admin", "staff"].includes(this.role);
  }
  next();
});

const userModel = mongoose.models.User || mongoose.model("User", userSchema);

export default userModel;
