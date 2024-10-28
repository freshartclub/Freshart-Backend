const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
  {
    incType: {
      type: String,
    },
    incGroup: {
      type: String,
    },
    description: {
      type: String,
    },
    title: {
      type: String,
    },
    severity: {
      type: String,
    },
    status: {
      type: String,
    },
    note: {
      type: String,
    },
    date: {
      type: Date,
    },
    initTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Incident", incidentSchema);
