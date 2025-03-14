const mongoose = require("mongoose");

const followerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId },
    circle: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  {
    timestamps: true,
  }
);

followerSchema.index({ user: 1 });
followerSchema.index({ circle: 1 });

module.exports = mongoose.model("Follower", followerSchema);
