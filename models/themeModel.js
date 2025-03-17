const mongoose = require("mongoose");

const ThemeSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    themeName: {
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

module.exports = mongoose.model("Theme", ThemeSchema);
