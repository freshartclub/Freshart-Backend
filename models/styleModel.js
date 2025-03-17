const mongoose = require("mongoose");

const artworkStyle = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    styleName: {
      type: String,
    },
    isMain: {
      type: Boolean,
      default: false,
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

module.exports = mongoose.model("Style", artworkStyle);
