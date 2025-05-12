const mongoose = require("mongoose");

const makeOfferSchema = new mongoose.Schema(
  {
    artwork: { type: mongoose.Schema.Types.ObjectId },
    user: { type: mongoose.Schema.Types.ObjectId },
    offeredArtist: { type: mongoose.Schema.Types.ObjectId },
    type: { type: String },
    maxOffer: { type: Number, default: 1 },
    status: { type: String },
    counterOffer: [
      {
        userType: { type: String },
        isAccepted: { type: Boolean },
        offerprice: { type: Number },
        createdAt: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("MakeOffer", makeOfferSchema);
