const mongoose = require("mongoose");

const carsouelSchema = new mongoose.Schema(
  {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    type: { type: String },
    title: { type: String },
    content: { type: String },
    subtitle: { type: String },
    carouselImg: { type: String },
    link: { type: Object },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Carousel", carsouelSchema);
