const mongoose = require("mongoose");

const subscriptionModel = new mongoose.Schema(
  {
    orderId: { type: String },
    sheduleRef: { type: String },
    status: { type: String },
    type: { type: String },
    start_date: { type: Date },
    end_date: { type: Date },
    isCurrActive: { type: Boolean },
    isScheduled: { type: Boolean },
    schedule_defined: { type: Number },
    no_card: { type: Boolean },
    user: { type: mongoose.Schema.Types.ObjectId },
    plan: { type: mongoose.Schema.Types.ObjectId },
    otherSub: { type: mongoose.Schema.Types.ObjectId },
    error_log: { type: String },
    isCancelled: { type: Boolean },
  },
  {
    timestamps: true,
  }
);

subscriptionModel.index({ user: 1 });
subscriptionModel.index({ plan: 1 });

module.exports = mongoose.model("Subscription", subscriptionModel);
