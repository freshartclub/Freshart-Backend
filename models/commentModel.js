const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    comment: {
      type: String,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
    },
    file: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ post: 1 });

module.exports = mongoose.model("Comment", commentSchema);
