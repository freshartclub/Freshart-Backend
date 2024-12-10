const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
    },
    orderType: {
      type: String,
      default: "subscription",
    },
    status: {
      type: String,
    },
    orderID: {
      type: String,
    },
    price: {
      type: Number,
    },
    discount: {
      type: Number,
    },
    tax: {
      type: Number,
    },
    shipping: {
      type: Number,
    },
    discount: {
      type: Number,
    },
    subTotal: {
      type: Number,
    },
    total: {
      type: Number,
    },
    items: [{ type: Object }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SubscriptionOrder", orderSchema);
