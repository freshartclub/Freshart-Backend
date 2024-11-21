const mongoose = require("mongoose");

const recentlyView = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
    },
    artworks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ArtWork",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("RecentlyView", recentlyView);
