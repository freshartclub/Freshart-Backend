const mongoose = require("mongoose");

const subscribeArtworkchema = new mongoose.Schema(
  {
    artwork: [{ type: mongoose.Schema.Types.ObjectId }],
    user: { type: mongoose.Schema.Types.ObjectId },
    type: { type: String },
    collectionRef: { type: String },
    pickupDate: { type: Date },
    returnDate: { type: Date },
    status: { type: String },
    instructions: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubscribeArtwork", subscribeArtworkchema);
