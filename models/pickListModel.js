const mongoose = require("mongoose");

const artworkStyle = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    picklistName: {
      type: String,
    },
    picklist: [
      {
        isDeleted: {
          type: Boolean,
          default: false,
        },
        name: {
          type: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Picklist", artworkStyle);
