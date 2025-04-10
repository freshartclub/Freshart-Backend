const mongoose = require("mongoose");

const subscriptionModel = new mongoose.Schema(
  {
    orderId: { type: String },
    status: { type: String },
    type: { type: String },
    start_date: { type: Date },
    end_date: { type: Date },
    isScheduled: { type: Boolean },
    schedule_defined: { type: Number },
    user: { type: mongoose.Schema.Types.ObjectId },
    plan: { type: mongoose.Schema.Types.ObjectId },
    otherSchedule: { type: mongoose.Schema.Types.ObjectId },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Subscription", subscriptionModel);
