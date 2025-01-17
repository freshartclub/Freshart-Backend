const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    code: {
      type: String,
    },
    name: {
      type: String,
    },
    note: {
      type: String,
    },
    validFrom: {
      type: Date,
    },
    validTo: {
      type: Date,
    },
    restriction: {
      type: Array,
    },
    usage: {
      type: Number,
    },
    subscriptionPlan: [{ type: mongoose.Schema.Types.ObjectId, ref: "Plan" }],
    catalogs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Catalog" }],
    extension: {
      type: Number,
    },
    discount: {
      type: Number,
    },
    disAmount: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Coupon", couponSchema);
