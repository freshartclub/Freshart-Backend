const mongoose = require("mongoose");

const subscriptionModel = new mongoose.Schema(
  {
    status: { type: String },
    schedule_type: { type: String },
    schedule_defined: { type: Number },
    schedule_completed: { type: Number },
    user: { type: mongoose.Schema.Types.ObjectId },
    plan: { type: mongoose.Schema.Types.ObjectId },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Subscription", subscriptionModel);
