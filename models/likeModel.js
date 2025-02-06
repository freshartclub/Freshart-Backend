const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
  {
    like: {
      type: String,
      enum: ["like", "love", "haha", "wow", "sad", "angry"],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
  },
  {
    timestamps: true,
  }
);

likeSchema.index({ post: 1 });

module.exports = mongoose.model("Like", likeSchema);
