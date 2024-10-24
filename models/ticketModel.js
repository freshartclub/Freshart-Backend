const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
    },
    ticketType: {
      type: String,
    },
    status: {
      type: String,
      default: "Created",
    },
    ticketId: {
      type: String,
    },
    subject: {
      type: String,
    },
    region: {
      type: String,
    },
    message: {
      type: String,
    },
    ticketImg: {
      type: Object,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Ticket", ticketSchema);
