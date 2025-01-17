const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    planGrp: {
      type: String,
    },
    catalogs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Catalog",
      },
    ],
    planName: {
      type: String,
    },
    planDesc: {
      type: String,
    },
    standardPrice: {
      type: Number,
    },
    standardYearlyPrice: {
      type: Number,
    },
    currentPrice: {
      type: Number,
    },
    currentYearlyPrice: {
      type: Number,
    },
    defaultPlan: {
      type: Boolean,
    },
    defaultArtistFees: {
      type: Number,
    },
    numArtworks: {
      type: Number,
    },
    numLargeArtworks: {
      type: Number,
    },
    individualShipment: {
      type: Boolean,
    },
    logCarrierSubscription: {
      type: String,
    },
    logCarrierPurchase: {
      type: String,
    },
    purchaseDiscount: {
      type: String,
    },
    limitPurchaseDiscount: {
      type: String,
    },
    monthsDiscountSubscription: {
      type: Number,
    },
    planImg: {
      type: String,
    },
    planData: [{ type: Object }],
    status: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Plan", planSchema);
