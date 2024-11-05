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
    discipline: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Discipline",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MediaSupport", mediaSupportSchema);
