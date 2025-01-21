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
    artworks: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("HomeArtwork", artworkStyle);
