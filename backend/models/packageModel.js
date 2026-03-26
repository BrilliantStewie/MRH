import mongoose from "mongoose";

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    packageType: {
      type: String,
      required: true,
      trim: true,
    },

    roomTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoomType",
      default: null,
      validate: {
        validator(value) {
          const normalizedType = String(this.packageType || "").trim().toLowerCase();
          if (normalizedType !== "room package") {
            return true;
          }
          return Boolean(value);
        },
        message: "Room packages must be linked to a room type.",
      },
    },

    description: {
      type: String,
      default: "",
    },

    amenities: [
      {
        type: String,
        trim: true,
      },
    ],

    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

packageSchema.index({ name: 1, packageType: 1, roomTypeId: 1 }, { unique: true });

packageSchema.virtual("roomType").get(function () {
  if (this.roomTypeId?.name) {
    return this.roomTypeId;
  }
  return this.roomTypeId || null;
});

const Package =
  mongoose.models.Package ||
  mongoose.model("Package", packageSchema);

export default Package;
