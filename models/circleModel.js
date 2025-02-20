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
    members: [{ type: mongoose.Schema.Types.ObjectId }],
    status: { type: String, default: "Draft" },
    type: { type: String, default: "Public" },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Circle", circleSchema);
