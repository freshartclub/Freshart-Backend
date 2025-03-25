const mongoose = require("mongoose");

const subscriptionModel = new mongoose.Schema(
  {
    orderId: { type: String },
    status: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId },
    plan: { type: mongoose.Schema.Types.ObjectId },
    pay_ref: { type: String },
    pmt_ref: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Subscription", subscriptionModel);
