const mongoose = require("mongoose");

const artworkStyle = new mongoose.Schema(
  {
    material: {
      isDeleted: {
        type: Boolean,
        default: false,
      },
      materialName: {
        type: String,
      },
      spanishMaterialName: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Style", artworkStyle);
