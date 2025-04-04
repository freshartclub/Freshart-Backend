const mongoose = require("mongoose");

const subscriptionModel = new mongoose.Schema(
  {
    orderId: { type: String },
    status: { type: String },
    type: { type: String },
    start_date: { type: Date }, // when user buy 1month only
    end_date: { type: Date }, // when user buy 1month only
    schedule_type: { type: String },
    schedule_defined: { type: Number },
    schedule_completed: { type: Number },
    schedule_start: { type: Date },
    schedule_end: { type: Date },
    user: { type: mongoose.Schema.Types.ObjectId },
    plan: { type: mongoose.Schema.Types.ObjectId },
    otherSchedule: { type: mongoose.Schema.Types.ObjectId },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Subscription", subscriptionModel);
