const mongoose = require("mongoose");

const insigniaSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    credentialName: {
      type: String,
    },
    credentialGroup: {
      type: String,
    },
    credentialPriority: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    insigniaImage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Insignia", insigniaSchema);
