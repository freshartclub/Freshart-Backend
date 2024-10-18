const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    artsit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
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
    ticketDate: {
      type: Date,
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
