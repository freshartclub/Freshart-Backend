const mongoose = require("mongoose");

const artWorkSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      default: "draft",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
    },
    exclusive: { type: Boolean },
    numLikes: { type: Number, default: 0 },
    lastModified: [{ type: Date }],
    artworkId: { type: String },
    isHighlighted: { type: Boolean },
    isArtProvider: { type: String },
    provideArtistName: { type: String },
    rejectReason: { type: String },
    artworkName: { type: String },
    artworkCreationYear: { type: String },
    artworkSeries: { type: String },
    productDescription: { type: String },
    collectionList: { type: String },
    media: { type: Object },
    additionalInfo: { type: Object },
    commercialization: { type: Object },
    pricing: { type: Object },
    inventoryShipping: { type: Object },
    discipline: { type: Object },
    promotions: { type: Object },
    restriction: { type: Object },
    tags: { type: Object },
    reviewDetails: { type: Object },
    views: [{ type: Object }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ArtWork", artWorkSchema);
