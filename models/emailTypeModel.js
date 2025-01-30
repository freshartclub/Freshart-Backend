const mongoose = require("mongoose");

const emailTypeSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    lang: {
      type: String,
    },
    emailType: {
      type: String,
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
