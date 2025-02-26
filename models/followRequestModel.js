const mongoose = require("mongoose");

const followRequset = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId },
    circle: { type: mongoose.Schema.Types.ObjectId },
  },
  {
    timestamps: true,
  }
);

followRequset.index({ user: 1 });
followRequset.index({ circle: 1 });

module.exports = mongoose.model("FollowRequest", followRequset);
