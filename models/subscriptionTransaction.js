const mongoose = require("mongoose");

const subscriptionTransactionSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId },
    user: { type: mongoose.Schema.Types.ObjectId },
    plan: { type: mongoose.Schema.Types.ObjectId },
    status: { type: String },
    transcationId: { type: String },
    timestamp: { type: String },
    amount: { type: Number },
    currency: { type: String },
    discount: { type: Number },
    sha1hash: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SubscriptionTransaction", subscriptionTransactionSchema);
