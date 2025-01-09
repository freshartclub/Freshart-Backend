const mongoose = require("mongoose");

const catalogSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    catalogImg: {
      type: String,
    },
    catalogName: {
      type: String,
    },
    catalogDesc: {
      type: String,
    },
    defaultArtistFee: {
      type: Number,
    },
    catalogCommercialization: {
      type: String,
      trim: true,
    },
    artworkList: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ArtWork",
      },
    ],
    catalogCollection: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Collection",
      },
    ],
    artProvider: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Artist",
      },
    ],
    subPlan: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Plan",
      },
    ],
    status: {
      type: String,
    },
    exclusiveCatalog: {
      type: Boolean,
      default: false,
    },
    details: {
      type: Object,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Catalog", catalogSchema);
