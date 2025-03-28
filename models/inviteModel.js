const mongoose = require("mongoose");

const inviteSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
    },
    email: {
      type: String,
    },
    firstName: {
      type: String,
    },
    surname1: {
      type: String,
    },
    surname2: {
      type: String,
    },
    phone: {
      type: String,
    },
    country: {
      type: String,
    },
    region: {
      type: String,
    },
    city: {
      type: String,
    },
    zipCode: {
      type: String,
    },
    gender: {
      type: String,
    },
    dob: {
      type: Date,
    },
    discountCode: {
      type: String,
    },
    inviteCode: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Invite", inviteSchema);
