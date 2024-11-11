const mongoose = require("mongoose");

const catalogSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    catalogImg: {
      type: String,
    },
    catalogName: {
      type: String,
    },
    catalogDesc: {
      type: String,
    },
    artworkList: {
      type: Array,
    },
    catalogCollection: {
      type: Array,
    },
    artProvider: {
      type: Array,
    },
    subPlan: {
      type: String,
    },
    exclusiveCatalog: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Catalog", catalogSchema);
