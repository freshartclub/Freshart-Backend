const mongoose = require("mongoose");

const notificationTypeSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    lang: {
      type: String,
      trim: true,
    },
    notificationType: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
    },
    subject: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("NotificationType", notificationTypeSchema);
