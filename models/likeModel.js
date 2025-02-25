const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
    },
    reaction: {
      type: String,
      enum: ["like", "love", "haha", "wow", "sad", "angry"],
    },
  },
  {
    timestamps: true,
  }
);

likeSchema.index({ post: 1 });

likeSchema.index({ post: 1, owner: 1 });

module.exports = mongoose.model("Like", likeSchema);
