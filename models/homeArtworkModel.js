const mongoose = require("mongoose");

const artworkStyle = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    artworksTitle: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
    },
    text: {
      type: String,
    },
    artworks: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("HomeArtwork", artworkStyle);
