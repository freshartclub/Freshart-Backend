const mongoose = require("mongoose");

const emailTypeSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    emailLang: {
      type: String,
    },
    emailType: {
      type: String,
      trim: true,
    },
    emailDesc: {
      type: String,
    },
    emailHead: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("EmailType", emailTypeSchema);
