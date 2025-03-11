const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    collectionName: {
      type: String,
      trim: true,
    },
    collectionDesc: {
      type: String,
    },
    collectionFile: {
      type: String,
    },
    expertDetails: {
      type: Object,
    },
    artworkList: [
      {
        artworkId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ArtWork",
        },
        artworkDesc: {
          type: String,
        },
      },
    ],
    collectionTags: { type: Array },
    status: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

collectionSchema.index({ isDeleted: 1 });
collectionSchema.index({ collectionName: 1 });

module.exports = mongoose.model("Collection", collectionSchema);
