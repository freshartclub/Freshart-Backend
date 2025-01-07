const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    planGrp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Catalog",
    },
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
    discountSubscription: {
      type: String,
    },
    monthsDiscountSubscription: {
      type: Number,
    },
    planImg: {
      type: String,
    },
    planData: [
      {
        size: {
          type: String,
        },
        minSubTime: {
          type: String,
        },
      },
    ],
    status: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Plan", planSchema);
