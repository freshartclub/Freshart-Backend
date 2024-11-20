const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    collectionName: {
      type: String,
    },
    collectionDesc: {
      type: String,
    },
    artworkList: {
      type: Array,
    },
    status: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Collection", collectionSchema);
