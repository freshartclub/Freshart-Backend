const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
    },
    type: {
      type: String,
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
    billingAddress: {
      type: Object,
    },
    shippingAddress: {
      type: Object,
    },
    tax: {
      type: Number,
    },
    taxAmount: {
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
    evidence: {
      type: Object,
    },
    note: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);
