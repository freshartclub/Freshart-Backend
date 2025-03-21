const mongoose = require("mongoose");

const favoriteModel = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId },
    list: [
      {
        title: { type: String },
        items: [
          {
            type: { type: String },
            item: { type: mongoose.Schema.Types.ObjectId },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

favoriteModel.index({ owner: 1 });

module.exports = mongoose.model("Favorite", favoriteModel);
