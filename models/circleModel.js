const mongoose = require("mongoose");

const circleSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    foradmin: { type: Boolean },
    title: { type: String },
    description: { type: String },
    content: { type: String },
    mainImage: { type: String },
    coverImage: { type: String },
    categories: { type: Array },
    managers: [{ type: mongoose.Schema.Types.ObjectId }],
    postCount: { type: Number, default: 0 },
    followerCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    status: { type: String, default: "Draft" },
    type: { type: String, default: "Public" },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Circle", circleSchema);
