const mongoose = require("mongoose");

const checkImageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId },
    image: { type: String },
    height: { type: Number },
    width: { type: Number },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CheckImage", checkImageSchema);
