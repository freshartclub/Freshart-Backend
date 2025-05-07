const mongoose = require("mongoose");

const shipmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId },
    shipmentId: { type: String },
    sender: { type: Object },
    recipient: { type: Object },
    parcels: [{ type: Object }],
    status: { type: String, default: "created" },
    statusHistory: [{ status: { type: String }, timestamp: { type: Date }, location: { type: String }, note: { type: String } }],
    pickup: { date: { type: String }, timeSlot: { type: String } },
    assignedDriver: { type: String },
    deliveryProof: { type: Object },
    labelUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Shipment", shipmentSchema);
