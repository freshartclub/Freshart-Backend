const mongoose = require("mongoose");

const artworkTechnicSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    technicName: {
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

module.exports = mongoose.model("Technic", artworkTechnicSchema);
