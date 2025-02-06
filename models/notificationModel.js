const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
      unique: true,
    },
    notifications: [
      {
        subject: {
          type: String,
        },
        message: {
          type: String,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
        isDeleted: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
