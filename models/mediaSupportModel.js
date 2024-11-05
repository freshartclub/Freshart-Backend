const mongoose = require("mongoose");

const mediaSupportSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    mediaName: {
      type: String,
    },
    spanishMediaName: {
      type: String,
    },
    category: {
      type: [mongoose.Schema.Types.ObjectId],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MediaSupport", mediaSupportSchema);
