const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
    },
    orderType: {
      type: String,
      default: "Purchase",
    },
    status: {
      type: String,
    },
    orderId: {
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
    subTotal: {
      type: Number,
    },
    items: [
      {
        artWork: { type: mongoose.Schema.Types.ObjectId, ref: "ArtWork" },
        quantity: { type: Number },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PurchaseOrder", orderSchema);
