const mongoose = require("mongoose");

const transcationSchema = new mongoose.Schema(
  {
    transcationId: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId },
    orderId: { type: String },
    status: { type: String },
    timestamp: { type: String },
    amount: { type: String },
    sha1hash: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", transcationSchema);
