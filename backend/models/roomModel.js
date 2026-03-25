import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      required: true,
    },

    roomTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoomType",
      required: true,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
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

    images: [
      {
        type: String,
        trim: true,
      },
    ],

    coverImage: {
      type: String,
      default: "",
    },

    available: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

roomSchema.virtual("building").get(function () {
  return this.buildingId?.name || "";
});

roomSchema.virtual("roomType").get(function () {
  return this.roomTypeId?.name || "";
});

roomSchema.pre("validate", function (next) {
  if (!this.coverImage && Array.isArray(this.images) && this.images.length > 0) {
    this.coverImage = this.images[0];
  }
  next();
});

const roomModel = mongoose.models.Room || mongoose.model("Room", roomSchema);

export default roomModel;


