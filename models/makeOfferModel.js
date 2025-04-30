const mongoose = require("mongoose");

const makeOfferSchema = new mongoose.Schema(
  {
    artwork: { type: mongoose.Schema.Types.ObjectId },
    user: { type: mongoose.Schema.Types.ObjectId },
    offeredArtist: { type: mongoose.Schema.Types.ObjectId },
    offerprice: { type: Number },
    type: { type: String },
    maxOffer: { type: Number },
    counterOffer: [
      {
        comment: { type: String },
        offerprice: { type: Number },
        userType: { type: String },
      },
    ],
    isAccepted: { type: Boolean },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MakeOffer", makeOfferSchema);
