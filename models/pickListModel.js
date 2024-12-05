const mongoose = require("mongoose");

const artworkStyle = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    picklistName: {
      type: String,
      trim: true,
    },
    picklist: [
      {
        isDeleted: {
          type: Boolean,
          default: false,
        },
        name: {
          type: String,
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Picklist", artworkStyle);
