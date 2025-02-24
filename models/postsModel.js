const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    circle: { type: mongoose.Schema.Types.ObjectId },
    owner: { type: mongoose.Schema.Types.ObjectId },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    content: { type: String },
    file: { type: String },
  },
  {
    timestamps: true,
  }
);

postSchema.index({ circle: 1 });

postSchema.index({ circle: 1, _id: 1 });

module.exports = mongoose.model("Post", postSchema);
