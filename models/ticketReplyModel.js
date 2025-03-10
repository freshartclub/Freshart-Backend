const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
    },
    ticketType: {
      type: String,
    },
    status: {
      type: String,
    },
    message: {
      type: String,
    },
    ticketImg: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TicketReply", ticketSchema);
