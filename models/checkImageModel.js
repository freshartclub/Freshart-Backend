const mongoose = require("mongoose");

const checkImageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId },
    image: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CheckImage", checkImageSchema);
