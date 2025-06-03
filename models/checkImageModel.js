const mongoose = require("mongoose");

const checkImageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId },
     name: { type: String },
    image: { type: String },
    height: { type: Number },
    width: { type: Number },
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

module.exports = mongoose.model("CheckImage", checkImageSchema);
