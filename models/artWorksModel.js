const mongoose = require("mongoose");

const artWorkSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
    },
    artworkName: { type: String },
    artworkCreationYear: { type: String },
    artworkSeries: { type: String },
    productDescription: { type: String },
    collections: { type: String },
    media: { type: Object },
    additionalInfo: { type: Object },
    commercialization: { type: Object },
    pricing: { type: Object },
    inventoryShipping: { type: Object },
    discipline: { type: Object },
    promotions: { type: Object },
    restriction: { type: Object },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ArtWork", artWorkSchema);
