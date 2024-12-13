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
    urgency: {
      type: String,
    },
    priority: {
      type: String,
    },
    impact: {
      type: String,
    },
    message: {
      type: String,
    },
    ticketImg: {
      type: Object,
    },
    ticketFeedback: {
      isLiked: {
        type: Boolean,
      },
      message: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Ticket", ticketSchema);
