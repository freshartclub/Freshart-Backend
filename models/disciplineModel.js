const mongoose = require("mongoose");

const disciplineSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    disciplineImage: {
      type: String,
    },
    disciplineName: {
      type: String,
    },
    disciplineSpanishName: {
      type: String,
    },
    disciplineDescription: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Discipline", disciplineSchema);