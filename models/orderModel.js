const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
    },
    type: {
      type: String,
    },
    art_type: {
      type: String,
    },
    status: {
      type: String,
    },
    orderId: {
      type: String,
    },
    amount: {
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
    taxAmount: {
      type: Number,
    },
    shipping: {
      type: Number,
    },
    discount: {
      type: Number,
    },
    currency: {
      type: String,
    },
    subTotal: {
      type: Number,
    },
    total: {
      type: Number,
    },
    items: [{ artwork: { type: mongoose.Schema.Types.ObjectId }, logistics: { type: Object }, other: { type: Object } }],
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
