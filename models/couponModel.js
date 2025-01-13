const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    couponCode: {
      type: String,
    },
    discount: {
      type: Number,
    },
    expiryDate: {
      type: Date,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
    },
    numOfUses: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Coupon", couponSchema);
