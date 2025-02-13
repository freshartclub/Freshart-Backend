const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
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
    forhomepage: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("FAQ", faqSchema);
