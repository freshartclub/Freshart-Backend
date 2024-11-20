const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    kbGrp: {
      type: String,
    },
    kbTitle: {
      type: String,
    },
    kbDesc: {
      type: String,
    },
    tags: {
      type: Array,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("KB", faqSchema);
