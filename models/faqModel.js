const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    faqImg: {
      type: Array,
    },
    faqGrp: {
      type: String,
    },
    faqQues: {
      type: String,
    },
    faqAns: {
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

module.exports = mongoose.model("FAQ", faqSchema);
