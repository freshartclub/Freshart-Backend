const mongoose = require("mongoose");

const visualizeSchema = new mongoose.Schema(
  {
    name: { type: String },
    group: { type: String },
    tags: [{ type: String }],
    image: { type: String },
    dimension_width: { type: Number },
    dimension_height: { type: Number },
    area_x1: { type: Number },
    area_y1: { type: Number },
    area_x2: { type: Number },
    area_y2: { type: Number },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Visualize", visualizeSchema);
