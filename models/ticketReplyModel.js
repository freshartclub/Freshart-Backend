const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
    },
    ticketType: {
      type: String,
    },
    status: {
      type: String,
    },
    ticketId: {
      type: String,
    },
    name: {
      type: String,
    },
    email: {
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

module.exports = mongoose.model("TicketReply", ticketSchema);
